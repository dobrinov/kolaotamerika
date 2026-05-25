#!/usr/bin/env ruby
# frozen_string_literal: true

require 'cgi'
require 'csv'
require 'json'

module Build
  module_function

  # Map of social_* column name -> JSON label
  SOCIAL_COLUMNS = {
    'social_facebook'  => 'Facebook',
    'social_instagram' => 'Instagram',
    'social_viber'     => 'Viber',
    'social_youtube'   => 'YouTube',
    'social_tiktok'    => 'TikTok',
    'social_linkedin'  => 'LinkedIn',
    'social_mobile_bg' => 'Mobile.bg',
    'social_cars_bg'   => 'Cars.bg'
  }.freeze

  SOURCE_COLUMNS = {
    'source_usa' => 'USA',
    'source_ca'  => 'CA',
    'source_kr'  => 'KR',
    'source_jp'  => 'JP',
    'source_eu'  => 'EU'
  }.freeze

  # Convert a CSV::Row into the Hash shape expected by the React app.
  # Audit columns (last_checked, verification_notes) are NOT included.
  # Key insertion order matches the existing JSON exactly so the regenerated
  # index.html has a minimal diff on the first round-trip.
  def self.row_to_company(row)
    company = {
      id:          row['id'],
      brand:       row['brand'],
      legal:       present(row['legal']),
      eik:         present(row['eik']),
      eikUrl:      present(row['eik_url']),
      founded:     present(row['founded']),
      city:        present(row['city']),
      capital:     to_int(row['capital']),
      capitalText: present(row['capital_text']),
      owner:       present(row['owner']),
      group:       present(row['group'])
    }

    company[:isGroupHead]   = true                   if row['is_group_head'] == 'yes'
    company[:parentBrandId] = row['parent_brand_id'] if present(row['parent_brand_id'])
    company[:hideFromList]  = true                   if row['hide_from_list'] == 'yes'

    company[:sources]  = collect_sources(row)
    company[:web]      = present(row['web'])
    company[:social]   = collect_socials(row)
    company[:phone]    = combined_phone(row)
    company[:email]    = present(row['email'])
    company[:verified] = row['verified'] == 'yes'
    company[:isNew]    = row['is_new'] == 'yes'
    company[:blurb]    = present(row['blurb'])

    company
  end

  # ---- helpers ----

  def self.present(value)
    return nil if value.nil?
    stripped = value.to_s.strip
    stripped.empty? ? nil : stripped
  end

  def self.to_int(value)
    v = present(value)
    return nil if v.nil?
    Integer(v)
  end

  def self.combined_phone(row)
    parts = [present(row['phone']), present(row['phone_2'])].compact
    return nil if parts.empty?
    parts.join(' · ')
  end

  def self.collect_sources(row)
    SOURCE_COLUMNS.filter_map { |col, label| label if row[col] == 'yes' }
  end

  def self.collect_socials(row)
    SOCIAL_COLUMNS.filter_map do |col, label|
      url = present(row[col])
      next nil unless url
      { label: label, url: url }
    end
  end

  # Sniff the column separator from the header line. Spreadsheet apps in EU
  # locales tend to save with `;` because cells contain comma decimals like
  # `10 225,00 €`. We accept either without forcing the user to know which.
  def self.detect_delimiter(csv_path)
    first_line = File.open(csv_path, &:readline)
    first_line.count(';') > first_line.count(',') ? ';' : ','
  end

  class MissingMarkerError < StandardError; end

  JSON_BLOCK_RE = %r{
    (<script\ type="application/json"\ id="company-data">)  # opening tag (captured)
    .*?                                                      # body (replaced)
    (</script>)                                              # closing tag (captured)
  }mx

  def self.splice_json_block(html, json_body)
    unless html.match?(JSON_BLOCK_RE)
      raise MissingMarkerError, 'Could not find <script id="company-data"> ... </script> markers in HTML'
    end
    # Block form (instead of string replacement) so backslashes in json_body
    # are never interpreted as regex backrefs (\1, \&, etc.).
    html.sub(JSON_BLOCK_RE) { "#{Regexp.last_match(1)}\n#{json_body}\n  #{Regexp.last_match(2)}" }
  end

  NOSCRIPT_UL_RE = %r{
    (<div\ class="seo-static">\s*<h1>.*?</h1>\s*<p>.*?</p>\s*<ul>) # opening (captured)
    .*?                                                            # body (replaced)
    (</ul>)                                                        # closing (captured)
  }mx

  # Lax fallback for fixtures/test HTML that has no <p> tag between <h1> and <ul>.
  NOSCRIPT_UL_LAX_RE = %r{
    (<div\ class="seo-static">.*?<ul>) # opening (captured)
    .*?                                 # body (replaced)
    (</ul>)                             # closing (captured)
  }mx

  def self.splice_noscript(html, companies)
    items = companies
            .reject { |c| c[:hideFromList] }
            .map { |c| noscript_item(c) }
            .join("\n        ")

    re = html.match?(NOSCRIPT_UL_RE) ? NOSCRIPT_UL_RE : NOSCRIPT_UL_LAX_RE
    unless html.match?(re)
      raise MissingMarkerError, 'Could not find <div class="seo-static"> ... <ul> ... </ul>'
    end
    html.sub(re) { "#{Regexp.last_match(1)}\n        #{items}\n      #{Regexp.last_match(2)}" }
  end

  def self.noscript_item(company)
    brand = CGI.escapeHTML(company[:brand].to_s)
    legal = company[:legal].to_s
    web   = company[:web].to_s
    label = real_legal_name?(legal) ? "#{brand} (#{CGI.escapeHTML(legal)})" : brand
    if web.empty?
      "<li>#{label}</li>"
    else
      %Q(<li><a href="#{CGI.escapeHTML(web)}" rel="nofollow noopener">#{label}</a></li>)
    end
  end

  # A legal value is a real registered name (worth showing in parens) only when
  # it's non-empty AND doesn't start with `(` (which marks a placeholder like
  # "(търговско име — North Auto group)" or "(юридическо лице не е намерено)")
  # and isn't a lone em-dash "—". Skipping these avoids `<li>Brand ((…))</li>`.
  def self.real_legal_name?(legal)
    return false if legal.empty?
    return false if legal.start_with?('(')
    return false if legal == '—'
    true
  end

  # Render companies as a JSON array string, one company per line, indented
  # two spaces. Matches the readability style of the existing embedded block.
  def self.render_json_array(companies)
    "[\n  " + companies.map { |c| JSON.generate(c) }.join(",\n  ") + "\n]"
  end

  JSONLD_BLOCK_RE = %r{
    (<script\ type="application/ld\+json"\ id="catalog-jsonld">) # opening (captured)
    .*?                                                          # body (replaced)
    (</script>)                                                  # closing (captured)
  }mx

  APP_BUNDLE_RE = %r{
    (<script\ id="app-bundle">)
    .*?
    (</script>)
  }mx

  # Minify app.js via esbuild (npx). The script is plain vanilla JS — no
  # JSX, no framework — so esbuild only does minification. If esbuild is
  # unavailable, fall back to the raw source unchanged.
  def self.compile_app(js_path: 'app.js')
    return nil unless File.exist?(js_path)
    cmd = ['npx', '--yes', 'esbuild', '--target=es2020', '--charset=utf8', '--minify', js_path]
    out = IO.popen([*cmd, err: [:child, :out]], &:read)
    return out if $?.success?
    warn "esbuild failed, falling back to raw app.js:\n#{out}"
    File.read(js_path)
  end

  def self.splice_app_bundle(html, body)
    return html unless html.match?(APP_BUNDLE_RE)
    html.sub(APP_BUNDLE_RE) { "#{Regexp.last_match(1)}\n#{body}\n  #{Regexp.last_match(2)}" }
  end

  SITE_URL = 'https://kolaotamerika.com/'

  # Schema.org @graph with two top-level nodes anchored to the live domain:
  #
  #   - WebSite (the catalog itself; helps Google index the site name and
  #     pick up potentialAction / inLanguage)
  #   - ItemList of AutoDealer organizations (one node per visible, non-hidden
  #     row). Each org carries name, legalName, identifier (ЕИК),
  #     foundingDate, url, telephone, email, PostalAddress and sameAs.
  def self.render_jsonld(companies)
    visible = companies.reject { |c| c[:hideFromList] }
    items = visible.each_with_index.map do |c, i|
      org = { '@type' => 'AutoDealer', 'name' => c[:brand] }
      org['@id']          = "#{SITE_URL}##{c[:id]}"
      org['legalName']    = c[:legal]   if real_legal_name?(c[:legal].to_s)
      org['identifier']   = c[:eik]     if c[:eik]
      org['foundingDate'] = c[:founded] if c[:founded]
      org['url']          = c[:web]     if c[:web]
      org['telephone']    = c[:phone].split(' · ').first if c[:phone]
      org['email']        = c[:email]   if c[:email]
      if c[:city]
        org['address'] = {
          '@type' => 'PostalAddress',
          'addressCountry' => 'BG',
          'addressLocality' => c[:city]
        }
      end
      same_as = (c[:social] || []).map { |s| s[:url] }.compact
      org['sameAs'] = same_as unless same_as.empty?
      if c[:sources] && !c[:sources].empty?
        country = { 'USA' => 'United States', 'CA' => 'Canada', 'EU' => 'European Union',
                    'KR' => 'South Korea', 'JP' => 'Japan' }
        org['areaServed'] = 'BG'
        org['knowsAbout'] = c[:sources].map { |s| "Внос на коли от #{country[s] || s}" }
      end
      { '@type' => 'ListItem', 'position' => i + 1, 'item' => org }
    end

    graph = [
      {
        '@type' => 'WebSite',
        '@id' => "#{SITE_URL}#site",
        'url' => SITE_URL,
        'name' => 'колаотамерика',
        'alternateName' => 'kolaotamerika',
        'description' => 'Независим каталог на български фирми, които внасят автомобили от САЩ, Канада, Южна Корея, Япония и Европа.',
        'inLanguage' => 'bg-BG',
        'image' => "#{SITE_URL}og-image.png",
        'publisher' => {
          '@type' => 'Organization',
          'name' => 'колаотамерика',
          'url' => SITE_URL,
          'logo' => "#{SITE_URL}og-image.png"
        }
      },
      {
        '@type' => 'ItemList',
        '@id' => "#{SITE_URL}#catalog",
        'url' => SITE_URL,
        'mainEntityOfPage' => SITE_URL,
        'name' => 'Каталог на вносители на коли в България',
        'description' => 'Сравнителен каталог: регистрирана фирма (ЕИК), уебсайт, телефон, имейл, Viber, аукциони, държави на внос.',
        'numberOfItems' => visible.length,
        'itemListElement' => items
      }
    ]

    JSON.pretty_generate({ '@context' => 'https://schema.org', '@graph' => graph })
  end

  def self.splice_jsonld(html, body)
    return html unless html.match?(JSONLD_BLOCK_RE)
    html.sub(JSONLD_BLOCK_RE) { "#{Regexp.last_match(1)}\n#{body}\n  #{Regexp.last_match(2)}" }
  end

  def self.run(csv_path: 'companies.csv', html_path: 'index.html')
    rows      = CSV.read(csv_path, headers: true, col_sep: detect_delimiter(csv_path))
    companies = rows.map { |r| row_to_company(r) }
    json_body = render_json_array(companies)
    jsonld    = render_jsonld(companies)
    bundle    = compile_app

    html = File.read(html_path)
    html = splice_json_block(html, json_body)
    html = splice_noscript(html, companies)
    html = splice_jsonld(html, jsonld)
    html = splice_app_bundle(html, bundle) if bundle
    File.write(html_path, html)
    companies.length
  end
end

# Allow direct invocation: `ruby build.rb`
if $PROGRAM_NAME == __FILE__
  begin
    count = Build.run
    warn "build.rb: regenerated index.html with #{count} companies"
  rescue Errno::ENOENT => e
    warn "build.rb: missing file — #{e.message}"
    exit 1
  rescue Build::MissingMarkerError => e
    warn "build.rb: #{e.message}"
    exit 1
  end
end
