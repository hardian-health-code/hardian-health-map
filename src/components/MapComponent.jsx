import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import { RefreshCw, Maximize, Minimize, Search, X as CloseIcon } from 'lucide-react';

// Returns the bounding box of the largest polygon in a feature (by geographic area).
// This centres the map on the mainland, ignoring remote islands/territories.
const getMainlandBounds = (feature) => {
  const geom = feature.geometry;
  if (!geom) return null;

  const ringArea = (ring) => Math.abs(
    ring.reduce((sum, c, i, arr) => {
      const next = arr[(i + 1) % arr.length];
      return sum + c[0] * next[1] - next[0] * c[1];
    }, 0) / 2
  );

  const rings = geom.type === 'Polygon'
    ? [geom.coordinates[0]]
    : geom.type === 'MultiPolygon'
      ? geom.coordinates.map(p => p[0])
      : [];

  let best = null;
  for (const ring of rings) {
    const area = ringArea(ring);
    if (!best || area > best.area) {
      const lons = ring.map(c => c[0]);
      const lats = ring.map(c => c[1]);
      best = { area, minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) };
    }
  }
  return best ? [[best.minLat, best.minLon], [best.maxLat, best.maxLon]] : null;
};

// Geography-specific zoom/center overrides
const GEOGRAPHY_OVERRIDES = {
  'NZL': { center: [-41.2, 173.5], zoom: 5 }
};

// Reusable zoom logic
const zoomToCountry = (iso, feature, map) => {
  if (GEOGRAPHY_OVERRIDES[iso]) {
    const { center, zoom } = GEOGRAPHY_OVERRIDES[iso];
    map.flyTo(center, zoom, { duration: 0.6 });
  } else {
    const mainland = getMainlandBounds(feature);
    if (mainland) {
      map.flyToBounds(mainland, { padding: [50, 50], maxZoom: 5, duration: 0.8 });
    } else {
      // FIX: flyToBounds cannot accept a GeoJSON geometry — fall back to default view
      map.setView([20, 0], 2, { animate: true, duration: 0.8 });
    }
  }
};

// Resolves a unique ISO key for countries that share -99 in the GeoJSON
const getEffectiveISO = (feature) => {
  if (!feature || !feature.properties) return null;
  const iso = feature.properties.ISO_A3 || feature.properties['ISO3166-1-Alpha-3'];
  const name = feature.properties.ADMIN || feature.properties.name;
  
  if (iso === '-99') {
    if (name === 'Kosovo') return 'XKX';
    if (name === 'Somaliland') return 'SOL';
  }
  return iso;
};

// Helper to escape HTML and prevent XSS
const escapeHTML = (str) => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
};

const filterOptions = [
  { key: 'acceptsUKCA', label: 'UKCA' },
  { key: 'acceptsCE', label: 'CE' },
  { key: 'acceptsFDA', label: 'FDA' },
  { key: 'isIMDRF', label: 'IMDRF' },
  { key: 'isMDSAP', label: 'MDSAP' }
];

const SEARCH_ALIASES = {
  'england': 'GBR',
  'scotland': 'GBR',
  'wales': 'GBR',
  'britain': 'GBR',
  'united kingdom': 'GBR',
  'uk': 'GBR',
  'great britain': 'GBR',
  'america': 'USA',
  'united states': 'USA',
  'usa': 'USA',
  'hong kong': 'HKG',
  'hk': 'HKG',
  'puerto rico': 'PRI'
};

const MapControls = ({ onReset, filters, toggleFilter, geoJsonRef, data, geoJsonData, onCountrySelect }) => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReset = () => {
    if (onReset) onReset();
    if (geoJsonRef.current) {
      const bounds = geoJsonRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [30, 0],
          maxZoom: 4,
          animate: true,
          duration: 0.8
        });
      }
    } else {
      map.setView([20, 0], 2);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const filtered = Object.entries(data)
      .map(([iso, country]) => ({ iso, ...country }))
      .filter(({ iso, name, agency, agencyFullName }) => {
        const lowerQuery = query.toLowerCase().trim();
        const lowerName = (name || '').toLowerCase();
        const lowerAgency = (agency || '').toLowerCase();
        const lowerAgencyFull = (agencyFullName || '').toLowerCase();
        
        // Direct matches
        if (lowerName.includes(lowerQuery) || lowerAgency.includes(lowerQuery) || lowerAgencyFull.includes(lowerQuery)) return true;
        
        // FIX: use iso (the key) instead of country.iso (which doesn't exist)
        for (const [alias, targetIso] of Object.entries(SEARCH_ALIASES)) {
          if (alias.includes(lowerQuery) && iso === targetIso) {
            return true;
          }
        }
        
        return false;
      })
      .slice(0, 10);

    setSearchResults(filtered);
    setShowResults(true);
  };

  const selectResult = (result) => {
    setSearchQuery('');
    setShowResults(false);
    
    if (!geoJsonData) return;

    // Find the feature in GeoJSON
    const feature = geoJsonData.features.find(f => getEffectiveISO(f) === result.iso);
    if (!feature) return;

    // Trigger map selection logic
    const name = feature.properties.ADMIN || feature.properties.name;
    const props = { ...feature.properties, ISO_A3: result.iso, ADMIN: name };
    onCountrySelect(props);

    // Zoom to country
    zoomToCountry(result.iso, feature, map);
  };

  return (
    <div className="map-controls">
      <div className="control-stack">
        <button 
          onClick={handleReset}
          className="reset-btn"
          title="Reset Map"
        >
          <RefreshCw size={18} />
        </button>
        <button 
          onClick={toggleFullscreen}
          className="reset-btn"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
      
      <div className="filters-and-search-stack">
        <div className="map-filters">
          {filterOptions.map(option => (
            <button
              key={option.key}
              className={`filter-btn ${filters[option.key] ? 'active' : ''}`}
              onClick={() => toggleFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="map-search" ref={searchRef}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search country or agency (e.g. MHRA)"
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
            />
            {searchQuery && (
              <CloseIcon 
                size={16} 
                className="clear-search" 
                onClick={() => { setSearchQuery(''); setShowResults(false); }} 
              />
            )}
          </div>
          
          {showResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(result => (
                <div 
                  key={result.iso} 
                  className="search-result-item"
                  onClick={() => selectResult(result)}
                >
                  <div className="result-main">
                    <span className="result-name">{result.name}</span>
                    {result.agency && <span className="result-agency">{result.agency}</span>}
                  </div>
                  {result.agencyFullName && (
                    <div className="result-fullname">{result.agencyFullName}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Component to handle initial fitting and responsive window resizing
const MapResizer = ({ geoJsonRef, dataReady }) => {
  const map = useMap();

  const handleFit = useCallback(() => {
    if (geoJsonRef.current) {
      const bounds = geoJsonRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [30, 0],
          maxZoom: 4,
          animate: false
        });
      }
    }
  }, [map, geoJsonRef]);

  useEffect(() => {
    if (dataReady) {
      const timer = setTimeout(handleFit, 100);
      window.addEventListener('resize', handleFit);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleFit);
      };
    }
  }, [dataReady, handleFit]);

  return null;
};

const MapComponent = ({ data, filters, selectedCountry, onCountrySelect, onResetMap, toggleFilter }) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const filtersRef = useRef(filters);
  const selectedCountryRef = useRef(selectedCountry);
  const geoJsonRef = useRef(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    selectedCountryRef.current = selectedCountry;
  }, [selectedCountry]);

  useEffect(() => {
    fetch('/hardian-health-map/countries.geo.json')
      .then(res => res.json())
      .then(data => setGeoJsonData(data))
      .catch(err => console.error("Could not fetch GeoJSON", err));
  }, []);

  const getCountryColor = useCallback((feature) => {
    const iso = getEffectiveISO(feature);
    const countryInfo = data[iso];
    if (!countryInfo) return '#f3f4f6';

    let activeFilterCount = 0;
    let matchCount = 0;

    for (const [key, isActive] of Object.entries(filtersRef.current)) {
      if (isActive) {
        activeFilterCount++;
        if (key === 'isMDSAP') {
          if (countryInfo.mdsapStatus && countryInfo.mdsapStatus !== 'Non-Participant') {
            matchCount++;
          }
        } else if (key === 'isIMDRF') {
          if (countryInfo.imdrfStatus && countryInfo.imdrfStatus !== 'Non-Member') {
            matchCount++;
          }
        } else if (countryInfo[key]) {
          matchCount++;
        }
      }
    }

    if (activeFilterCount === 0) {
      if (countryInfo.agency === 'No Data') {
        return '#f3f4f6';
      }
      return '#e8dcfc'; 
    }

    if (matchCount === activeFilterCount && activeFilterCount > 0) {
      if (countryInfo.agency === 'No Data') return '#f3f4f6';
      return 'var(--map-highlight)';
    }

    return '#f3f4f6';
  }, [data]);

  const getLatestStyle = useCallback((feature) => {
    const iso = getEffectiveISO(feature);
    const selected = selectedCountryRef.current;
    const isSelected = selected && (
      iso === selected.ISO_A3 || 
      iso === selected['ISO3166-1-Alpha-3'] || 
      iso === selected.ADM0_A3
    );
    
    const baseColor = getCountryColor(feature);
    const fillColor = isSelected ? 'var(--map-highlight)' : baseColor;
    
    return {
      fillColor: fillColor,
      weight: isSelected ? 2 : 1.5,
      opacity: 1,
      color: '#FFFFFF',
      fillOpacity: (isSelected || fillColor === 'var(--map-highlight)') ? 0.9 : 0.8,
      className: 'country-path',
      zIndex: isSelected ? 1000 : 1
    };
  }, [getCountryColor]);

  // Update map styles when filters or selection changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle(getLatestStyle);
    }
  }, [filters, selectedCountry, getLatestStyle]);

  const onEachFeature = (feature, layer) => {
    const iso = getEffectiveISO(feature);
    const name = feature.properties.ADMIN || feature.properties.name;
    const info = data[iso];

    if (name) {
      const safeName = escapeHTML(name);
      let tooltipContent = `<span class="custom-tooltip-name">${safeName}</span>`;
      if (info && info.agency) {
        const safeAgency = escapeHTML(info.agency);
        tooltipContent += `<span class="custom-tooltip-info">${safeAgency}</span>`;
      }
      
      layer.bindTooltip(tooltipContent, {
        sticky: true,
        direction: 'auto',
        className: 'custom-tooltip'
      });
    }

    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          fillColor: 'var(--map-highlight)',
          fillOpacity: 1,
          weight: 2,
          color: '#FFFFFF'
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(getLatestStyle(layer.feature));
        if (layer.closeTooltip) {
           layer.closeTooltip();
        }
      },
      click: (e) => {
        const layer = e.target;
        if (layer.closeTooltip) {
           layer.closeTooltip();
        }
        const props = { ...feature.properties, ISO_A3: iso, ADMIN: name };
        onCountrySelect(props);
        const map = e.target._map;
        zoomToCountry(iso, feature, map);
      }
    });
  };

  if (!geoJsonData) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'var(--text-dark)'}}>Loading Map Data...</div>;

  return (
    <MapContainer 
      center={[20, 0]} 
      zoom={2} 
      minZoom={2}
      worldCopyJump={true}
      maxBounds={[[-65, -Infinity], [85, Infinity]]}
      maxBoundsViscosity={1.0}
      style={{ height: "100%", width: "100%", backgroundColor: "var(--bg-primary)" }}
      zoomControl={false}
      attributionControl={false}
    >
      <MapResizer geoJsonRef={geoJsonRef} dataReady={!!geoJsonData} />
      <MapControls 
        onReset={onResetMap} 
        filters={filters} 
        toggleFilter={toggleFilter} 
        geoJsonRef={geoJsonRef} 
        data={data}
        geoJsonData={geoJsonData}
        onCountrySelect={onCountrySelect}
      />
      <GeoJSON 
        ref={geoJsonRef}
        data={geoJsonData} 
        style={getLatestStyle}
        onEachFeature={onEachFeature}
        filter={(feature) => feature.properties.ADMIN !== 'Antarctica' && feature.properties.ISO_A3 !== 'ATA' && feature.properties.name !== 'Antarctica'}
      />
    </MapContainer>
  );
};

export default MapComponent;
