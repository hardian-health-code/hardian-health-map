import React, { useState } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import regulatoryData from './data/regulatoryData.json';
import './index.css';

const INITIAL_FILTERS = {
  acceptsUKCA: false,
  acceptsCE: false,
  acceptsFDA: false,
  isIMDRF: false,
  isMDSAP: false
};

function App() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Mutually exclusive filter toggle
  const toggleFilter = (key) => {
    setFilters(prev => {
      const wasActive = prev[key];
      // Clear all filters, then toggle the clicked one
      const newFilters = { ...INITIAL_FILTERS };
      if (!wasActive) newFilters[key] = true;
      return newFilters;
    });
  };

  const handleCountrySelect = (countryProps) => {
    setSelectedCountry(countryProps);
  };

  const handleCloseSidebar = () => {
    setSelectedCountry(null);
  };

  const handleResetMap = () => {
    setFilters(INITIAL_FILTERS);
    setSelectedCountry(null);
  };

  return (
    <div className="main-content">
      <div className="map-wrapper" style={{ marginRight: window.innerWidth > 768 && selectedCountry ? '400px' : '0' }}>
        <MapComponent 
          data={regulatoryData} 
          filters={filters} 
          selectedCountry={selectedCountry}
          onCountrySelect={handleCountrySelect}
          onResetMap={handleResetMap}
          toggleFilter={toggleFilter}
        />
      </div>
      
      <Sidebar 
        selectedCountry={selectedCountry} 
        data={regulatoryData} 
        onClose={handleCloseSidebar}
      />
    </div>
  );
}

export default App;
