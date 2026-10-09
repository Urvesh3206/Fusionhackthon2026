import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { LineLayer, ScatterplotLayer, PolygonLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import { useEmergencyStore } from '../../stores/useEmergencyStore';
import { Legend } from './Legend';

// Puri District Coordinates
const INITIAL_VIEW_STATE = {
  longitude: 85.8312,
  latitude: 19.8135,
  zoom: 10.8,
  pitch: 30,
  bearing: 0
};

export const MapView: React.FC = () => {
  const { state, plan, setSelectedEdge, setSelectedHospital, setSelectedAmbulance, setSelectedCall } = useEmergencyStore();
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors, © CARTO'
            }
          },
          layers: [
            {
              id: 'osm-tiles-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
        zoom: INITIAL_VIEW_STATE.zoom,
        interactive: false // Controlled by DeckGL
      });

      mapRef.current = map;
    } catch (e) {
      console.warn("MapLibre init fallback:", e);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync MapLibre with DeckGL view state
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.jumpTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        bearing: viewState.bearing,
        pitch: viewState.pitch
      });
    }
  }, [viewState]);

  // Build deck.gl layers
  const layers: any[] = [];

  // 1. Hazard Polygon Layer (Cyclone Cone)
  if (state?.forecast?.cone_polygon && state.forecast.cone_polygon.length >= 3) {
    layers.push(
      new PolygonLayer({
        id: 'cyclone-cone-layer',
        data: [{ polygon: state.forecast.cone_polygon }],
        getPolygon: (d: any) => d.polygon,
        getFillColor: [59, 130, 246, 60],
        getLineColor: [96, 165, 250, 180],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        pickable: true,
        onHover: (info: any) => {
          if (info.object) {
            setHoverInfo({
              x: info.x,
              y: info.y,
              content: `Cyclone Uncertainty Cone (Winds: ${state.forecast.wind_speed_kmh} km/h, Rain: ${state.forecast.rain_rate_mmh} mm/h)`
            });
          }
        }
      })
    );
  }

  // 2. Risk Heatmap / Grid Layer
  if (state?.risk_grid) {
    layers.push(
      new ScatterplotLayer({
        id: 'risk-grid-layer',
        data: state.risk_grid,
        getPosition: (d: any) => [d.lon, d.lat],
        getRadius: 1200,
        radiusUnits: 'meters',
        getFillColor: (d: any) => {
          const r = Math.min(1.0, d.combined_risk);
          if (r < 0.3) return [234, 179, 8, 50];
          if (r < 0.6) return [249, 115, 22, 100];
          return [220, 38, 38, 140];
        },
        getLineColor: [255, 255, 255, 30],
        getLineWidth: 1,
        lineWidthUnits: 'pixels',
        pickable: true,
        onHover: (info: any) => {
          if (info.object) {
            setHoverInfo({
              x: info.x,
              y: info.y,
              content: `Zone: ${info.object.id} | Pop: ${info.object.population} (Elderly: ${info.object.elderly_population}) | Risk Index: ${info.object.combined_risk}`
            });
          }
        }
      })
    );
  }

  // 3. Road Network Path Layer
  if (state?.road_edges) {
    layers.push(
      new PathLayer({
        id: 'road-edges-layer',
        data: state.road_edges,
        getPath: (d: any) => d.geometry,
        getColor: (d: any) => {
          if (d.is_closed) return [244, 63, 94, 255];
          if (d.failure_prob > 0.4) return [245, 158, 11, 230];
          return [16, 185, 129, 200];
        },
        getWidth: (d: any) => (d.is_closed ? 6 : 4),
        widthUnits: 'pixels',
        pickable: true,
        onClick: (info: any) => {
          if (info.object) setSelectedEdge(info.object.id);
        },
        onHover: (info: any) => {
          if (info.object) {
            const e = info.object;
            const status = e.is_closed ? `CLOSED: ${e.closure_reason}` : `OPEN (Failure Prob: ${(e.failure_prob * 100).toFixed(0)}%)`;
            setHoverInfo({
              x: info.x,
              y: info.y,
              content: `${e.name} | ${status} | Elev: ${e.elevation_m}m | Base Speed: ${e.speed_kmh} km/h`
            });
          }
        }
      })
    );
  }

  // 4. Hospitals Layer
  if (state?.hospitals) {
    layers.push(
      new ScatterplotLayer({
        id: 'hospitals-layer',
        data: state.hospitals,
        getPosition: (d: any) => d.location,
        getRadius: (d: any) => (d.usable_beds > 100 ? 550 : 400),
        radiusUnits: 'meters',
        getFillColor: (d: any) => {
          if (!d.has_power || !d.has_comms || d.free_icu_beds === 0) return [225, 29, 72, 255];
          if (d.derated_capacity_ratio < 1.0) return [234, 88, 12, 255];
          return [5, 150, 105, 255];
        },
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        pickable: true,
        onClick: (info: any) => {
          if (info.object) setSelectedHospital(info.object.id);
        },
        onHover: (info: any) => {
          if (info.object) {
            const h = info.object;
            setHoverInfo({
              x: info.x,
              y: info.y,
              content: `${h.name} | Free Beds: ${h.usable_beds - h.occupied_beds}/${h.usable_beds} (ICU: ${h.free_icu_beds}) | Power: ${h.has_power ? 'YES' : 'OFF'} | Comms: ${h.has_comms ? 'ONLINE' : 'DOWN'}`
            });
          }
        }
      }),
      new TextLayer({
        id: 'hospitals-text-layer',
        data: state.hospitals,
        getPosition: (d: any) => d.location,
        getText: (d: any) => (d.free_icu_beds === 0 && !d.has_power ? '⚠ H' : 'H'),
        getSize: 12,
        getColor: [255, 255, 255, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontWeight: 'bold'
      })
    );
  }

  // 5. Ambulances Layer
  if (state?.ambulances) {
    layers.push(
      new ScatterplotLayer({
        id: 'ambulances-layer',
        data: state.ambulances,
        getPosition: (d: any) => d.location,
        getRadius: 300,
        radiusUnits: 'meters',
        getFillColor: (d: any) => (d.unit_type === 'ALS' ? [37, 99, 235, 255] : [6, 182, 212, 255]),
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        pickable: true,
        onClick: (info: any) => {
          if (info.object) setSelectedAmbulance(info.object.id);
        },
        onHover: (info: any) => {
          if (info.object) {
            const a = info.object;
            setHoverInfo({
              x: info.x,
              y: info.y,
              content: `Ambulance: ${a.callsign} (${a.unit_type}) | Status: ${a.status} | Station: ${a.station_id}`
            });
          }
        }
      })
    );
  }

  // 6. Emergency Calls Layer
  if (state?.emergency_calls) {
    layers.push(
      new ScatterplotLayer({
        id: 'emergency-calls-layer',
        data: state.emergency_calls,
        getPosition: (d: any) => d.location,
        getRadius: 350,
        radiusUnits: 'meters',
        getFillColor: (d: any) => (d.priority === 'P1_Critical' ? [239, 68, 68, 255] : [245, 158, 11, 255]),
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 2,
        lineWidthUnits: 'pixels',
        pickable: true,
        onClick: (info: any) => {
          if (info.object) setSelectedCall(info.object.id);
        },
        onHover: (info: any) => {
          if (info.object) {
            const c = info.object;
            setHoverInfo({
              x: info.x,
              y: info.y,
              content: `EMERGENCY CALL: [${c.priority}] ${c.patient_condition} | Req: ${c.required_specialty} (${c.district_zone})`
            });
          }
        }
      })
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* MapLibre Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* DeckGL Overlay */}
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE as any}
        controller={true}
        onViewStateChange={({ viewState }: any) => setViewState(viewState)}
        layers={layers}
        onHover={(info: any) => {
          if (!info.object) setHoverInfo(null);
        }}
      />

      {/* Floating Hover Tooltip */}
      {hoverInfo && (
        <div
          className="absolute z-50 pointer-events-none bg-slate-900/95 border border-slate-700 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg shadow-xl font-mono backdrop-blur-sm"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
        >
          {hoverInfo.content}
        </div>
      )}

      {/* Symbology Legend */}
      <Legend />
    </div>
  );
};
