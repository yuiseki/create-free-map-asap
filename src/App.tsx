import { Layer, Map, MapRef, Source, useMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import osmtogeojson from "osmtogeojson";
import useSWR from "swr";
import { useEffect } from "react";
import { Marker, PaddingOptions } from "react-map-gl";
import * as turf from "@turf/turf";

// osmtogeojsonを使っているよ！！
// osmtogeojsonを使っているよ！！
// osmtogeojsonを使っているよ！！
// useSWRを使うために必要な関数
const osmtogeojsonFetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    console.error(res);
    throw new Error("An error occurred while fetching the data.");
  }

  const json = await res.json();
  return osmtogeojson(json);
};

// Turf.jsを使っているよ！！
// Turf.jsを使っているよ！！
// Turf.jsを使っているよ！！
// 与えられたGeoJSONの範囲に合わせて地図をズームする関数
const fitBoundsToGeoJson = (
  mapRef: MapRef | null,
  geoJson: GeoJSON.FeatureCollection,
  padding?: PaddingOptions
) => {
  if (!mapRef) return;

  const [minLng, minLat, maxLng, maxLat] = turf.bbox(geoJson);
  mapRef.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: padding,
      duration: 1000,
    }
  );
};

// OverpassAPIを使っているよ！！
// OverpassAPIを使っているよ！！
// OverpassAPIを使っているよ！！
const overpassApiEndpoint = "https://z.overpass-api.de/api/interpreter";

const TokyoAreaLayer = ({ areaName }: { areaName: string }) => {
  const queryChuo = `
    [out:json][timeout:30000];
    area["name:en"="Tokyo"]->.outer;
    (
      relation["name:en"="${areaName}"](area.outer);
    );
    out geom;
    `;
  const overpassRequestUrl = `${overpassApiEndpoint}?data=${encodeURIComponent(
    queryChuo
  )}`;
  const { data: geoJson } = useSWR(overpassRequestUrl, osmtogeojsonFetcher);

  const { current: map } = useMap();

  useEffect(() => {
    if (map && geoJson) {
      fitBoundsToGeoJson(map, geoJson, {
        top: 40,
        left: 40,
        right: 40,
        bottom: 40,
      });
    }
  }, [geoJson, map]);

  if (!geoJson) {
    return null;
  }

  return (
    <Source id="chuo-ward" type="geojson" data={geoJson}>
      <Layer
        id="chuo-ward"
        type="fill"
        source="chuo-ward"
        paint={{
          "fill-color": "#0000ff",
          "fill-opacity": 0.2,
        }}
      />
    </Source>
  );
};

const TokyoRestaurantLayer = ({
  icon,
  cuisine,
  areaName,
}: {
  icon: string;
  cuisine: string;
  areaName: string;
}) => {
  const queryRamen = `
    [out:json][timeout:30000];
    area["name:en"="Tokyo"]->.outer;
    area["name:en"="${areaName}"]->.inner;
    (
      nwr["amenity"="restaurant"]["cuisine"="${cuisine}"](area.inner)(area.outer);
    );
    out geom;
    `;
  const overpassRequestUrl = `${overpassApiEndpoint}?data=${encodeURIComponent(
    queryRamen
  )}`;
  const { data: geoJson } = useSWR(overpassRequestUrl, osmtogeojsonFetcher);

  if (!geoJson) {
    return null;
  }

  return (
    <>
      {geoJson.features.map((feature) => {
        // マーカーとして描画する
        // ここで型チェックをする
        if (
          feature.geometry.type !== "Point" ||
          !Array.isArray(feature.geometry.coordinates) ||
          feature.geometry.coordinates.length !== 2
        ) {
          return null;
        }
        return (
          <Marker
            key={feature.id}
            longitude={feature.geometry.coordinates[0]}
            latitude={feature.geometry.coordinates[1]}
          >
            <div
              title={
                feature.properties?.name ? feature.properties.name : "no name"
              }
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                opacity: "0.8",
                lineHeight: "1",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                  backdropFilter: "blur(4px)",
                  borderRadius: "4px",
                  padding: "6px 4px",
                  fontSize: "2em",
                  fontFamily: "sans-serif, emoji",
                  lineHeight: "1.1",
                }}
              >
                {icon}
              </div>
            </div>
          </Marker>
        );
      })}
    </>
  );
};

function App() {
  const areaName = "Chuo";
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 0,
          zoom: 10,
        }}
        hash={false}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json"
      >
        <TokyoRestaurantLayer areaName={areaName} icon="🍜" cuisine="ramen" />
        <TokyoAreaLayer areaName={areaName} />
      </Map>
    </div>
  );
}

export default App;
