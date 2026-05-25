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

  # ── Display feature config (mirrors app.js FEATURES) ────────────────────
  FEATURES = [
    { id: 'info_amount', label: 'Количество информация', short: 'Инф.',   group: 'Основни',       type: 'info' },
    { id: 'registered',  label: 'Регистрирана фирма',   short: 'Фирма',  group: 'Основни',       type: 'company' },
    { id: 'website',     label: 'Уебсайт',              short: 'Сайт',   group: 'Основни',       type: 'url' },
    { id: 'email',       label: 'Имейл',                short: 'Имейл',  group: 'Основни',       type: 'email' },
    { id: 'phone',       label: 'Телефон за връзка',    short: 'Тел.',   group: 'Основни',       type: 'phone' },
    { id: 'viber',       label: 'Viber група',          short: 'Viber',  group: 'Основни',       type: 'url' },
    { id: 'source_usa',  label: 'Внос от САЩ',          short: 'САЩ',    group: 'Внася от',      type: 'value' },
    { id: 'source_ca',   label: 'Внос от Канада',       short: 'CA',     group: 'Внася от',      type: 'value' },
    { id: 'source_eu',   label: 'Внос от ЕС',           short: 'EU',     group: 'Внася от',      type: 'value' },
    { id: 'source_kr',   label: 'Внос от Корея',        short: 'KR',     group: 'Внася от',      type: 'value' },
    { id: 'source_jp',   label: 'Внос от Япония',       short: 'JP',     group: 'Внася от',      type: 'value' },
    { id: 'facebook',    label: 'Facebook страница',    short: 'FB',     group: 'Други канали',  type: 'url' },
    { id: 'instagram',   label: 'Instagram',            short: 'IG',     group: 'Други канали',  type: 'url' },
    { id: 'youtube',     label: 'YouTube канал',        short: 'YT',     group: 'Други канали',  type: 'url' },
    { id: 'tiktok',      label: 'TikTok',               short: 'TT',     group: 'Други канали',  type: 'url' },
    { id: 'mobile_bg',   label: 'Витрина в Mobile.bg',  short: 'Mobile', group: 'Други канали',  type: 'url' },
    { id: 'cars_bg',     label: 'Профил в Cars.bg',     short: 'Cars',   group: 'Други канали',  type: 'url' },
  ].freeze

  SOURCE_LABEL = { 'USA' => 'САЩ', 'CA' => 'Канада', 'EU' => 'ЕС', 'KR' => 'Корея', 'JP' => 'Япония' }.freeze
  INFO_KEY_IDS = %w[registered website email phone viber].freeze

  ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  ICON_DASH  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  ICON_ARROW_RIGHT = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6H9.5M9.5 6L6 2.5M9.5 6L6 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  ICON_SORT_DESC = '<svg class="sort-arrow" width="8" height="10" viewBox="0 0 8 10" aria-hidden="true"><path d="M4 8.5L1 4H7L4 8.5Z" fill="currentColor"/></svg>'

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

  # ── Display-shape transform (mirrors app.js transformCompany) ─────────
  def self.clean_url(u)
    u.to_s.sub(%r{\Ahttps?://(www\.)?}i, '').sub(%r{/\z}, '')
  end

  def self.pick_social(c, label)
    (c[:social] || []).find { |s| s[:label] == label }
  end

  def self.transform_for_display(c)
    facebook  = pick_social(c, 'Facebook')
    instagram = pick_social(c, 'Instagram')
    viber     = pick_social(c, 'Viber')
    youtube   = pick_social(c, 'YouTube')
    tiktok    = pick_social(c, 'TikTok')
    mobile    = pick_social(c, 'Mobile.bg') || pick_social(c, 'Mobile.bg (Център)')
    cars      = pick_social(c, 'Cars.bg')

    registered = false
    if c[:eik]
      registered = {
        eik: c[:eik],
        name: real_legal_name?(c[:legal].to_s) ? c[:legal] : '(непълно име)',
        date: c[:founded] || '—',
        address: c[:city] || '—',
        owner: c[:owner],
        capital: c[:capitalText],
        eikUrl: c[:eikUrl],
      }.compact
    end

    source_cell = ->(code) {
      (c[:sources] || []).include?(code) ? { value: "Активен внос от #{SOURCE_LABEL[code]}" } : false
    }

    url_val = ->(u) { u ? { value: u, display: clean_url(u) } : nil }

    fb_disp = facebook ? clean_url(facebook[:url]).sub(/\Afacebook\.com/, '') : nil
    ig_disp = instagram ? '@' + clean_url(instagram[:url]).sub(%r{\Ainstagram\.com/}, '').sub(/\?.*\z/, '') : nil
    yt_disp = youtube ? clean_url(youtube[:url]).sub(%r{\Ayoutube\.com/}, '') : nil
    tt_disp = tiktok ? clean_url(tiktok[:url]).sub(%r{\Atiktok\.com/}, '') : nil

    {
      id: c[:id],
      name: c[:brand],
      legalRaw: c[:legal],
      blurb: c[:blurb],
      location: c[:city] || '—',
      founded: c[:founded] ? c[:founded][0, 4].to_i : nil,
      capitalText: c[:capitalText],
      eik: c[:eik],
      eikUrl: c[:eikUrl],
      sources: c[:sources] || [],
      group: c[:group],
      isGroupHead: c[:isGroupHead] == true,
      isNew: c[:isNew] == true,
      values: {
        registered:  registered,
        source_usa:  source_cell.call('USA'),
        source_ca:   source_cell.call('CA'),
        source_eu:   source_cell.call('EU'),
        source_kr:   source_cell.call('KR'),
        source_jp:   source_cell.call('JP'),
        website:     url_val.call(c[:web]),
        facebook:    facebook ? { value: facebook[:url], display: fb_disp } : nil,
        instagram:   instagram ? { value: instagram[:url], display: ig_disp } : nil,
        viber:       viber ? { value: viber[:url], display: 'Viber група' } : nil,
        youtube:     youtube ? { value: youtube[:url], display: yt_disp } : nil,
        tiktok:      tiktok ? { value: tiktok[:url], display: tt_disp } : nil,
        mobile_bg:   mobile ? { value: mobile[:url], display: clean_url(mobile[:url]) } : nil,
        cars_bg:     cars ? { value: cars[:url], display: clean_url(cars[:url]) } : nil,
        phone:       c[:phone] ? { value: c[:phone], display: c[:phone] } : nil,
        email:       c[:email] ? { value: c[:email], display: c[:email] } : nil,
      },
    }
  end

  def self.info_percent(c)
    filled = INFO_KEY_IDS.count { |id| c[:values][id.to_sym] }
    (filled * 100.0 / INFO_KEY_IDS.length).round
  end

  # Default sort: info_amount desc, registered first for ties, alpha by name.
  def self.default_sort(companies)
    companies.sort_by.with_index do |c, i|
      [-info_percent(c), c[:values][:registered] ? 0 : 1, c[:name].downcase, i]
    end
  end

  # ── HTML rendering (mirrors app.js renderHeader / renderRow / renderCell) ─
  def self.h(s) = CGI.escapeHTML(s.to_s)

  def self.render_info_cell(c)
    pct = info_percent(c)
    %Q(<td class="cell cell--info"><div class="info-cell"><div class="info-bar" aria-hidden="true"><div class="info-fill" style="width:#{pct}%"></div></div><div class="info-pct mono">#{pct}%</div></div></td>)
  end

  def self.render_cell(c, f)
    return render_info_cell(c) if f[:type] == 'info'
    v = c[:values][f[:id].to_sym]
    present = !!v
    state = present ? 'yes' : 'no'
    icon = present ? ICON_CHECK : ICON_DASH
    label = present ? 'да' : 'не'
    aria = "#{h(f[:label])}: #{label}"

    tip = if !present then 'Не е налично'
          elsif f[:type] == 'company' then "#{v[:name]} · ЕИК #{v[:eik]}"
          elsif f[:type] == 'url' then 'Отвори'
          elsif f[:type] == 'phone' || f[:type] == 'email' then v[:display]
          elsif v[:value] then v[:value]
          else ''
          end
    tip_attr = %Q(data-tip="#{h(tip)}")

    if present && %w[url email phone].include?(f[:type])
      first_phone = f[:type] == 'phone' ? v[:value].to_s.split(/\s*·\s*/).first : v[:value]
      href = case f[:type]
             when 'email' then "mailto:#{v[:value]}"
             when 'phone' then "tel:#{first_phone.to_s.gsub(/[^+\d]/, '')}"
             else v[:value]
             end
      target = f[:type] == 'url' ? ' target="_blank" rel="noopener noreferrer"' : ''
      return %Q(<td class="cell cell--yes"><a class="cell-btn" href="#{h(href)}"#{target} aria-label="#{aria}" #{tip_attr}><span class="cell-mark" aria-hidden="true">#{icon}</span></a></td>)
    end

    is_company = present && f[:type] == 'company'
    is_source  = f[:type] == 'value' && f[:id].to_s.start_with?('source_')
    data_pop    = is_company ? %Q(data-pop="#{h(c[:id])}") : ''
    data_source = is_source  ? %Q(data-source="#{h(f[:id].to_s.sub('source_', '').upcase)}") : ''
    # Source cells are always clickable (both yes and no) — they open a
    # popover listing other companies that also import (or don't) from
    # that country.
    disabled = (present || is_source) ? '' : 'disabled'
    %Q(<td class="cell cell--#{state}"><button class="cell-btn" #{disabled} aria-label="#{aria}" #{tip_attr} #{data_pop}#{data_source}><span class="cell-mark" aria-hidden="true">#{icon}</span></button></td>)
  end

  def self.render_row(c, idx)
    meta = c[:founded] ? %Q(<div class="cmeta"><span>от #{h(c[:founded])}</span></div>) : ''
    cells = FEATURES.map { |f| render_cell(c, f) }.join
    <<~ROW.chomp
      <tr class="bodyrow" data-id="#{h(c[:id])}">
        <th class="namecell sticky-col" scope="row">
          <div class="rank">#{format('%02d', idx + 1)}</div>
          <div class="namebox">
            <div class="cname">#{h(c[:name])}</div>
            #{meta}
          </div>
        </th>
        #{cells}
        <td class="endcell"><button class="details-btn" data-drawer="#{h(c[:id])}">Детайли #{ICON_ARROW_RIGHT}</button></td>
      </tr>
    ROW
  end

  def self.render_thead
    groups = []
    cur = nil
    FEATURES.each do |f|
      if cur.nil? || cur[:name] != f[:group]
        cur = { name: f[:group], count: 1 }
        groups << cur
      else
        cur[:count] += 1
      end
    end

    group_row = %Q(<tr class="grouprow"><th class="ghead sticky-col" scope="col"><span class="ghead-label">Вносител</span></th>#{groups.map { |g| %Q(<th class="ghead ghead-group" colspan="#{g[:count]}" scope="colgroup"><span class="ghead-group-label">#{h(g[:name])}</span></th>) }.join}<th class="ghead ghead-end" scope="col"></th></tr>)

    # Default sort is info_amount desc — show descending arrow on Инф.
    name_th = %Q(<th class="head sticky-col head-sortable" scope="col" data-sort="name" aria-sort="none"><span class="head-label">Компания<span class="sort-arrow-slot"></span></span></th>)
    feat_ths = FEATURES.map do |f|
      active = f[:id] == 'info_amount'
      active_class = active ? ' head-sort-active' : ''
      aria_sort = active ? 'descending' : 'none'
      arrow = active ? ICON_SORT_DESC : ''
      %Q(<th class="head head-feat head-sortable#{active_class}" scope="col" data-sort="#{h(f[:id])}" data-tip="#{h(f[:label])}" aria-sort="#{aria_sort}"><span class="head-feat-label">#{h(f[:short])}<span class="sort-arrow-slot">#{arrow}</span></span></th>)
    end.join

    head_row = %Q(<tr class="headrow">#{name_th}#{feat_ths}<th class="head head-end" scope="col"></th></tr>)
    group_row + "\n" + head_row
  end

  def self.render_tbody(display_companies)
    default_sort(display_companies).each_with_index.map { |c, i| render_row(c, i) }.join("\n")
  end

  THEAD_RE = %r{(<thead\ id="thead">).*?(</thead>)}mx
  TBODY_RE = %r{(<tbody\ id="tbody">).*?(</tbody>)}mx

  def self.splice_thead(html, body)
    return html unless html.match?(THEAD_RE)
    html.sub(THEAD_RE) { "#{Regexp.last_match(1)}\n        #{body}\n      #{Regexp.last_match(2)}" }
  end

  def self.splice_tbody(html, body)
    return html unless html.match?(TBODY_RE)
    html.sub(TBODY_RE) { "#{Regexp.last_match(1)}\n        #{body}\n      #{Regexp.last_match(2)}" }
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
    visible   = companies.reject { |c| c[:hideFromList] }
    display   = visible.map { |c| transform_for_display(c) }

    json_body = render_display_json(display)
    jsonld    = render_jsonld(companies)
    bundle    = compile_app
    thead     = render_thead
    tbody     = render_tbody(display)

    html = File.read(html_path)
    html = splice_json_block(html, json_body)
    html = splice_jsonld(html, jsonld)
    html = splice_thead(html, thead)
    html = splice_tbody(html, tbody)
    html = splice_app_bundle(html, bundle) if bundle
    File.write(html_path, html)
    companies.length
  end

  # JSON the JS app reads at runtime — already in display shape, already
  # filtered to visible rows, default-sorted. JS uses it for re-sort
  # comparisons and to drive the drawer/popover for any clicked row.
  def self.render_display_json(display_companies)
    sorted = default_sort(display_companies)
    "[\n  " + sorted.map { |c| JSON.generate(c) }.join(",\n  ") + "\n]"
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
