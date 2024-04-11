import { Layer, Map, MapRef, Source, useMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import osmtogeojson from "osmtogeojson";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { FeatureCollection } from "geojson";
import { Marker, PaddingOptions } from "react-map-gl";
import * as turf from "@turf/turf";

// useSWRを使うために必要な関数
const jsonFetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    console.error(res);
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }

  return res.headers.get("content-type")?.includes("json")
    ? res.json()
    : async () => {
        const text = await res.text();
        return JSON.parse(text);
      };
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
      duration: 10000,
    }
  );
};

// OverpassAPIを使っているよ！！
// OverpassAPIを使っているよ！！
// OverpassAPIを使っているよ！！
const overpassApiEndpoint = "https://z.overpass-api.de/api/interpreter";

const ChuoWardLayer = () => {
  const queryChuo = `
    [out:json][timeout:30000];
    area["name:en"="Tokyo"]->.outer;
    (
      relation["name:en"="Chuo"](area.outer);
    );
    out geom;
    `;
  const overpassRequestUrl = `${overpassApiEndpoint}?data=${encodeURIComponent(
    queryChuo
  )}`;
  const { data } = useSWR(overpassRequestUrl, jsonFetcher);
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null);
  const { current: map } = useMap();

  useEffect(() => {
    if (data) {
      const newGeoJson = osmtogeojson(data);
      setGeoJson(newGeoJson);
      if (map && newGeoJson) {
        fitBoundsToGeoJson(map, newGeoJson, {
              top: 40,
              left: 40,
              right: 40,
              bottom: 40,
            });
      }
    }
  }, [data, map]);

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

const ChuoWardRamenLayer = () => {
  const queryRamen = `
    [out:json][timeout:30000];
    area["name:en"="Tokyo"]->.outer;
    area["name:en"="Chuo"]->.inner;
    (
      nwr["amenity"="restaurant"]["cuisine"="ramen"](area.inner)(area.outer);
    );
    out geom;
    `;

  const overpassRequestUrl = `${overpassApiEndpoint}?data=${encodeURIComponent(
    queryRamen
  )}`;
  const { data } = useSWR(overpassRequestUrl, jsonFetcher);
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (data) {
      const newGeoJson = osmtogeojson(data);
      setGeoJson(newGeoJson);
    }
  }, [data]);

  if (!geoJson) {
    return null;
  }

  return (
    <>
      {geoJson.features.map((feature) => {
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
              title={feature.properties?.name ? feature.properties.name : "no name"}
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
                🍜
              </div>
            </div>
          </Marker>
        );
      })}
    </>
  );
};

function App() {
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
        <ChuoWardRamenLayer />
        <ChuoWardLayer />
      </Map>
    </div>
  );
}

export default App;
