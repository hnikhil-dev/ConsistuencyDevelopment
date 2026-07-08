// components/HotspotMap.js
'use client';

import { MapContainer, TileLayer, Circle, Popup, CircleMarker } from 'react-leaflet';
import { useEffect, useState } from 'react';

// Centers for the 5 Wards in Pune South-East
const WARD_COORDINATES = {
  1: { center: [18.536, 73.893], color: '#16a34a' }, // Ward 1: KP Extension (Green - Low Deficit)
  2: { center: [18.508, 73.926], color: '#d97706' }, // Ward 2: Hadapsar (Yellow - Medium Deficit)
  3: { center: [18.488, 73.896], color: '#ea580c' }, // Ward 3: Wanowrie (Orange - Medium-High Deficit)
  4: { center: [18.479, 73.890], color: '#dc2626' }, // Ward 4: Kondhwa (Red - Severe Water Deficit)
  5: { center: [18.538, 73.915], color: '#dc2626' }  // Ward 5: Mundhwa (Red - Severe Road Deficit)
};

export default function HotspotMap({ wardStats, onSelectWard, selectedWardId, submissions = [] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-56 sm:h-72 md:h-96 lg:h-[420px] w-full rounded-xl bg-slate-100 flex items-center justify-center animate-pulse border border-slate-350">
        <span className="text-slate-500 font-bold">Loading Interactive Maps...</span>
      </div>
    );
  }

  // Pune South-East general center
  const position = [18.510, 73.905];

  // Filter submissions that have valid GPS tags
  const geotaggedSubmissions = submissions.filter(
    sub => sub.gps_lat && sub.gps_lng && !isNaN(parseFloat(sub.gps_lat)) && !isNaN(parseFloat(sub.gps_lng))
  );

  return (
    <div className="h-56 sm:h-72 md:h-96 lg:h-[420px] w-full rounded-xl overflow-hidden border border-slate-300 shadow-md relative z-10">
      <MapContainer 
        center={position} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#f1f5f9' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Professional Light Voyager Tiles
        />
        
        {/* Render Ward Circles */}
        {wardStats?.map(ward => {
          const coordInfo = WARD_COORDINATES[ward.ward_id];
          if (!coordInfo) return null;

          const isSelected = selectedWardId === ward.ward_id;
          
          // Radius scales with citizen count (hotspot size)
          const radius = 600 + (ward.citizen_count * 15);

          return (
            <Circle
              key={`ward-circle-${ward.ward_id}`}
              center={coordInfo.center}
              pathOptions={{
                color: coordInfo.color,
                fillColor: coordInfo.color,
                fillOpacity: isSelected ? 0.35 : 0.15,
                weight: isSelected ? 3 : 1
              }}
              radius={radius}
            >
              <Popup>
                <div className="text-slate-900 p-1 min-w-[200px]">
                  <h4 className="font-extrabold text-sm border-b pb-1 mb-1.5 text-blue-900">{ward.ward_name}</h4>
                  <div className="text-xs space-y-1 font-semibold text-slate-700">
                    <p>Population: <strong className="text-slate-950">{ward.population.toLocaleString()}</strong></p>
                    <p>Equity Deficit: <strong className="text-slate-950">{ward.equity_score}/10</strong></p>
                    <p>Citizen Suggestions: <strong className="text-slate-950">{ward.citizen_count}</strong></p>
                    <p>Active Clusters: <strong className="text-slate-950">{ward.cluster_count}</strong></p>
                  </div>
                  <button 
                    onClick={() => onSelectWard(ward.ward_id)}
                    className="mt-2.5 w-full text-center bg-blue-900 hover:bg-blue-800 text-white rounded text-[10px] py-1 font-black transition"
                  >
                    {isSelected ? "Clear Filter" : "Filter Dashboard by Ward"}
                  </button>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Render Individual Geolocated Citizen Pins */}
        {geotaggedSubmissions.map(sub => {
          return (
            <CircleMarker
              key={`sub-pin-${sub.id}`}
              center={[parseFloat(sub.gps_lat), parseFloat(sub.gps_lng)]}
              radius={7}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#f97316', // Government Saffron for active citizens pins
                fillOpacity: 1.0,
                weight: 1.5
              }}
            >
              <Popup>
                <div className="text-slate-900 p-1.5 max-w-[220px]">
                  <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded uppercase">
                      Citizen Proposal
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold">{sub.channel}</span>
                  </div>
                  <h5 className="font-extrabold text-xs text-slate-900">{sub.user_name}</h5>
                  <p className="text-xs text-slate-600 mt-1 italic leading-relaxed">
                    "{sub.raw_text}"
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 border-t pt-1 font-mono">
                    ID: {sub.id}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
