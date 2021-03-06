# encoding: utf-8
require 'rack'

module CartoDB
  module Importer2
    module UrlTranslator
      class OSM
        URL_REGEX               = /openstreetmap.org/
        TRANSLATED_URL_REGEX    = /api.openstreetmap.org/
        URL_TEMPLATE  = "http://api.openstreetmap.org/api/0.6/map?bbox="
        DW = 1200.0/2.0
        DH = 1000.0/2.0

        def translate(url)
          return url if !supported?(url) || translated?(url) 
          return "#{URL_TEMPLATE}#{bounding_box_for(url)}"
        end #translate

        def bounding_box_for(url)
          params = Rack::Utils.parse_query(url.split('?')[1])
          #2h, 6w
          lon   = params['lon'].to_f
          lat   = params['lat'].to_f
          zoom  = params['zoom'].to_i


          res   = 180 / 256.0 / 2**zoom
          py    = (90 + lat) / res
          px    = (180 + lon) / res
          lpx   = px - DW
          lpy   = py - DH
          upx   = px + DW
          upy   = py + DH

          lon1  = (res * lpx) - 180
          lat1  = (res * lpy) - 90
          lon2  = (res * upx) - 180
          lat2  = (res * upy) - 90

          [lon1, lat1, lon2, lat2].join(',')
        end #bounding_box_for

        def supported?(url)
          !!(url =~ URL_REGEX)
        end #supported?

        def translated?(url)
          !!(url =~ TRANSLATED_URL_REGEX)
        end #translated?
      end #OSM
    end # UrlTranslator
  end # Importer2
end # CartoDB

