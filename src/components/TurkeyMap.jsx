import React, { useState, useRef, useEffect } from 'react';
import pathData from '../data/path.json';
import russianInstitutionsData from '../data/russian_institutions.json';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';

const TurkeyMap = () => {
  const [provincePaths, setProvincePaths] = useState([]);  
  const [russianCenters, setRussianCenters] = useState([]);
  const [hoverCity, setHoverCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [zoomedCity, setZoomedCity] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(1);  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Hepsi');
  const [suggestions, setSuggestions] = useState([]);
  const [allCategories, setAllCategories] = useState(['Hepsi']);
  const [plakaToCity, setPlakaToCity] = useState({});
  const [cityToPlaka, setCityToPlaka] = useState({});  
  const [filteredInstitutions, setFilteredInstitutions] = useState({});
  
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const searchInputRef = useRef(null);

  const normalizeCode = (code) => {
    if (!code) return '';
    
    if (code.startsWith('TR-')) {
      return code.substring(3);
    } else if (code.startsWith('TR')) {
      return code.substring(2);
    }
    
    return code;
  };

  useEffect(() => {
    console.log("Harita verileri yükleniyor...");
    setProvincePaths(pathData);
    
    const plakaMapping = {};
    const cityMapping = {};
    
    pathData.forEach(province => {
      if (province.plaka && province.ilismi) {
        const normalizedPlaka = normalizeCode(province.plaka);
        
        plakaMapping[normalizedPlaka] = province.ilismi;
        plakaMapping[`TR${normalizedPlaka}`] = province.ilismi;
        plakaMapping[`TR-${normalizedPlaka}`] = province.ilismi;
        
        cityMapping[province.ilismi] = normalizedPlaka;
      }
    });
    
    setPlakaToCity(plakaMapping);
    setCityToPlaka(cityMapping);
    console.log("Plaka mapingi oluşturuldu:", plakaMapping);
    
    const categories = new Set(['Hepsi']);
    Object.keys(russianInstitutionsData).forEach(cityCode => {
      if (russianInstitutionsData[cityCode] && Array.isArray(russianInstitutionsData[cityCode])) {
        russianInstitutionsData[cityCode].forEach(institution => {
          if (institution.type) {
            categories.add(institution.type);
          }
        });
      }
    });
    
    setAllCategories(Array.from(categories));
  }, []);

  useEffect(() => {
    if (Object.keys(plakaToCity).length > 0) {
      console.log("Plaka mapingi hazır, kurumlar filtreleniyor...");
      filterByCategory('Hepsi');
    }
  }, [plakaToCity]);

  const filterByCategory = (category) => {
    setSelectedCategory(category);
    console.log("Kategori filtreleniyor:", category);
    
    const institutionsByPlaka = {};
    
    Object.keys(russianInstitutionsData).forEach(plaka => {
      const normalizedPlaka = normalizeCode(plaka);
      
      const cityName = plakaToCity[plaka] || plakaToCity[normalizedPlaka];
      
      if (!cityName) {
        console.warn(`Plaka karşılığı bulunamadı: ${plaka} / ${normalizedPlaka}`);
        return;
      }
      
      const institutions = russianInstitutionsData[plaka];
      
      if (!institutions || !Array.isArray(institutions)) {
        return;
      }
      
      const filteredList = category === 'Hepsi' 
        ? institutions 
        : institutions.filter(inst => inst.type === category);
      
      if (filteredList.length > 0) {
        institutionsByPlaka[normalizedPlaka] = filteredList;
      }
    });
    
    console.log("Filtrelenmiş kurumlar:", institutionsByPlaka);
    setFilteredInstitutions(institutionsByPlaka);
  };

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = select(svgRef.current);
    const g = select(gRef.current);

    const zoomHandler = zoom()
      .scaleExtent([0.8, 5]) 
      .translateExtent([[0, 0], [800, 350]]) 
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setCurrentZoomLevel(event.transform.k);
      })
      .filter(event => {
        return !event.type.includes('wheel') && 
               !event.type.includes('mouse') &&
               !event.type.includes('dblclick');
      });

    svg.call(zoomHandler);
    zoomBehaviorRef.current = zoomHandler;
    
    svg.style("cursor", "pointer");
    
    svg.transition()
      .duration(750)
      .call(zoomHandler.transform, zoomIdentity);
      
    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const handleCityClick = (cityID) => {
    console.log("Şehre tıklandı:", cityID);
    
    if (zoomedCity && zoomedCity !== cityID) {
      return;
    }
    
    if (zoomedCity === cityID) {
      resetMap();
    } else {
      setSelectedCity(cityID);
      setZoomedCity(cityID);
      setShowSideMenu(true);
      
      const cityPath = document.getElementById(cityID);
      if (cityPath && zoomBehaviorRef.current) {
        const bbox = cityPath.getBBox();
        const svg = select(svgRef.current);
        const svgWidth = 800;
        const svgHeight = 350;
        const targetScale = 2;
        const targetX = svgWidth / 2 - (bbox.x + bbox.width / 2) * targetScale;
        const targetY = svgHeight / 2 - (bbox.y + bbox.height / 2) * targetScale;
        const targetTransform = zoomIdentity.translate(targetX, targetY).scale(targetScale);
        
        svg.transition()
          .duration(1000)
          .call(zoomBehaviorRef.current.transform, targetTransform)
          .on('end', () => {
            setCurrentZoomLevel(targetScale);
          });
      }
    }
  };

  const resetMap = () => {
    setZoomedCity(null);
    setSelectedCity(null); 
    setSelectedInstitution(null);
    setShowSideMenu(false);
    setHoverCity(null);

    if (zoomBehaviorRef.current) {
      const svg = select(svgRef.current);
      svg.transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform, zoomIdentity)
        .on('end', () => {
          setCurrentZoomLevel(1);
        });
    }
  };

  const pathStyles = (cityID) => {
    const isSelected = selectedCity === cityID;
    const isHovered = hoverCity === cityID;
    const isZoomed = zoomedCity && zoomedCity !== cityID;
    
    return {
      cursor: "pointer",
      transition: "all 0.3s ease-in-out",
      transform: isHovered ? 'scale(1.008)' : 'scale(1)',
      fill: isSelected ? '#0032A0' 
           : isHovered ? '#DA291C' 
           : '#a0aec0', 
      stroke: '#4a5568', 
      strokeWidth: 0.5,
      opacity: isZoomed ? 0.3 : 1,
    };
  };

  const getMarkerColor = (type) => {
    switch(type) {
      case 'Büyükelçilik': return '#DA291C'; 
      case 'Konsolosluk': return '#DA291C'; 
      case 'Ticaret': return '#0032A0'; 
      case 'Enerji': return '#0032A0'; 
      case 'Kültür': return '#0032A0'; 
      case 'Üniversite': return '#5C9E31'; 
      case 'Diğer': return '#525252'; 
      default: return '#525252'; 
    }
  };

  const getCenterCount = (cityID) => {
    if (!cityID || !filteredInstitutions[cityID]) {
      return 0;
    }
    
    return filteredInstitutions[cityID].length;
  };

  const hasRussianCenters = (cityID) => {
    return getCenterCount(cityID) > 0;
  };

  const getInstitutionsList = () => {
    if (!zoomedCity) return [];
    
    return filteredInstitutions[zoomedCity] || [];
  };

  const handleInstitutionClick = (e, institution) => {
    if (e) e.stopPropagation(); 

    setSelectedInstitution(institution);
    setShowSideMenu(true);
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (!term.trim()) {
      setSuggestions([]);
      return;
    }
    
    const searchTermLower = term.toLowerCase();
    
    const allInstitutions = [];
    Object.keys(russianInstitutionsData).forEach(plaka => {
      const normalizedPlaka = normalizeCode(plaka);
      const cityName = plakaToCity[plaka] || plakaToCity[normalizedPlaka];
      
      if (!cityName) return;
      
      if (russianInstitutionsData[plaka] && Array.isArray(russianInstitutionsData[plaka])) {
        russianInstitutionsData[plaka].forEach(institution => {
          allInstitutions.push({
            ...institution,
            cityName,
            plaka: normalizedPlaka
          });
        });
      }
    });
    
    const matches = allInstitutions.filter(institution => {
      if (selectedCategory !== 'Hepsi' && institution.type !== selectedCategory) {
        return false;
      }
      
      return (
        institution.name?.toLowerCase().includes(searchTermLower) ||
        (institution.description && institution.description.toLowerCase().includes(searchTermLower)) ||
        (institution.cityName && institution.cityName.toLowerCase().includes(searchTermLower)) ||
        (institution.address && institution.address.toLowerCase().includes(searchTermLower))
      );
    });
    
    setSuggestions(matches.slice(0, 5));
  };

  const handleMapClick = (e) => {
    if (zoomedCity) {
      const isInsideG = e.target.closest('g[ref]') === gRef.current;
      
      if (isInsideG && showSideMenu) {
        setSelectedInstitution(null);
      }
      
      return;
    }
    
    setSelectedInstitution(null);
    setShowSideMenu(false);
  };

  const handleCloseSideMenu = (e) => {
    e.stopPropagation();
    resetMap();
  };

  const handleSuggestionClick = (institution) => {
    setSearchTerm('');
    setSuggestions([]);
    
    if (zoomedCity && zoomedCity !== institution.plaka) {
      return;
    }
    
    handleCityClick(institution.plaka);
    
    setTimeout(() => {
      setSelectedInstitution(institution);
    }, 1000);
  };

  const isDataEmpty = !provincePaths || provincePaths.length === 0 || 
                      !provincePaths[0]?.d || provincePaths[0]?.d === "";

  useEffect(() => {
    if (svgRef.current && gRef.current) {
      const cityPaths = document.querySelectorAll('.city-path');
      
      const clickHandlers = new Map();
      
      cityPaths.forEach(cityPath => {
        const handler = (e) => {
          if (e.target === cityPath && !e.defaultPrevented) {
            handleCityClick(cityPath.id);
          }
        };
        
        clickHandlers.set(cityPath, handler);
        cityPath.addEventListener('click', handler);
      });
      
      return () => {
        cityPaths.forEach(cityPath => {
          const handler = clickHandlers.get(cityPath);
          if (handler) {
            cityPath.removeEventListener('click', handler);
          }
        });
      };
    }
  }, [zoomedCity, provincePaths]);

  return (
    <div className='mt-4'>
      <h2 className="text-center mb-4">Türkiye'deki Rus Kurumları Haritası</h2>

      <div className="search-filter-container mb-4" style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '15px',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}>
        <div className="category-filter" style={{ flex: '0 0 200px' }}>
          <label htmlFor="category-select" className="mb-1 d-block" style={{ fontSize: '14px', color: '#555' }}>
            Kategori Seç:
          </label>
          <select 
            id="category-select"
            className="form-select"
            value={selectedCategory}
            onChange={(e) => filterByCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              backgroundColor: '#f8f9fa',
              fontSize: '14px'
            }}
          >
            {allCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div className="search-box" style={{ flex: '1 1 auto', position: 'relative' }}>
          <label htmlFor="search-input" className="mb-1 d-block" style={{ fontSize: '14px', color: '#555' }}>
            Kurum Ara:
          </label>
          <input
            ref={searchInputRef}
            id="search-input"
            type="text"
            className="form-control"
            placeholder="Kurum adı, şehir veya adres ara..."
            value={searchTerm}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
          
          {suggestions.length > 0 && (
            <div className="suggestions-list" style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              right: '0',
              backgroundColor: 'white',
              borderRadius: '0 0 6px 6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: '1000',
              maxHeight: '250px',
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderTop: 'none'
            }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`suggestion-${index}`}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: getMarkerColor(suggestion.type),
                      borderRadius: '50%',
                      marginRight: '10px' 
                    }} 
                  />
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{suggestion.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {suggestion.cityName} - {suggestion.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {zoomedCity && (
        <button 
          className="btn btn-sm mb-3"
          onClick={resetMap}
          style={{ 
            backgroundColor: "#0032A0",
            color: "white", 
            fontWeight: "500", 
            border: "none", 
            borderRadius: "6px",
            padding: "8px 16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#002780"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#0032A0"}
        >
          <span style={{ marginRight: "5px" }}>&#8592;</span> Türkiye Haritasına Dön
        </button>
      )}

      {isDataEmpty && (
        <div className="alert alert-warning">
          <strong>Uyarı:</strong> path.json dosyası ya yüklenemedi ya da boş veri içeriyor. 
          Lütfen dosyanın doğru formatta olduğunu kontrol edin.
        </div>
      )}
      
      <div className='position-relative' style={{ display: 'flex' }}>
        {showSideMenu && zoomedCity && (
          <div className='side-menu' style={{
            width: '30%',
            minWidth: '250px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            padding: '20px',
            marginRight: '15px',
            height: '600px',
            overflowY: 'auto',
            transition: 'all 0.3s ease',
            position: 'relative',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <button 
              className="btn btn-sm" 
              onClick={handleCloseSideMenu}
              style={{ 
                fontSize: '14px', 
                padding: '4px 9px', 
                position: 'absolute', 
                top: '10px', 
                right: '10px',
                zIndex: 10,
                backgroundColor: "#DA291C", 
                color: "white",
                border: "none",
                borderRadius: "50%",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#c42419"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#DA291C"}
            >
              <span>&times;</span>
            </button>
            
            {selectedInstitution ? (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 style={{ color: '#DA291C', marginBottom: '0' }}>Kurum Bilgileri</h4>
                </div>
                
                <div className="text-center mb-4">
                  {selectedInstitution.image && selectedInstitution.image !== "" ? (
                    <div 
                      style={{ 
                        width: '60px', 
                        height: '60px',
                        margin: '0 auto 10px',
                        overflow: 'hidden',
                        borderRadius: '50%',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        border: `2px solid ${getMarkerColor(selectedInstitution.type)}`
                      }}
                    >
                      <img 
                        src={selectedInstitution.image} 
                        alt={selectedInstitution.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.style.display = 'none';
                          const fallbackIcon = document.getElementById('fallback-icon-selected');
                          if (fallbackIcon) {
                            fallbackIcon.style.display = 'flex';
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  
                  <div 
                    id="fallback-icon-selected"
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      backgroundColor: getMarkerColor(selectedInstitution.type),
                      borderRadius: '50%',
                      margin: '0 auto 10px',
                      display: selectedInstitution.image && selectedInstitution.image !== "" ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  >
                    {selectedInstitution.type ? selectedInstitution.type.charAt(0) : 'K'}
                  </div>
                  <h5 style={{ color: '#333' }}>{selectedInstitution.name}</h5>
                  <div style={{ 
                    backgroundColor: getMarkerColor(selectedInstitution.type),
                    color: '#FFFFFF', 
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {selectedInstitution.type}
                  </div>
                </div>
                
                <div className="info-section mb-3">
                  <h6 style={{ color: '#0032A0', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>Kurum Bilgileri</h6>
                  <p className="mb-1">
                    <strong>Şehir:</strong> {selectedInstitution.cityName || plakaToCity[zoomedCity] || ''}
                  </p>
                  <p className="mb-3">
                    <strong>Adres:</strong> {selectedInstitution.address}
                  </p>

                  {selectedInstitution.description && (
                    <div className="mb-3">
                      <h6 style={{ color: '#0032A0', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>Açıklama</h6>
                      <p style={{ fontSize: '14px' }}>{selectedInstitution.description}</p>
                    </div>
                  )}
                  
                  {selectedInstitution.website && selectedInstitution.website !== "_" && (
                    <div className="mb-3 text-center">
                      <a 
                        href={selectedInstitution.website.startsWith('http') ? selectedInstitution.website : `https://${selectedInstitution.website}`} 
                        className="btn btn-sm mt-2" 
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          backgroundColor: '#0032A0', 
                          color: '#FFFFFF',
                          borderColor: 'transparent',
                          padding: '8px 15px',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          textDecoration: 'none'
                        }}
                      >
                        Websitesini Ziyaret Et
                      </a>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <button 
                      className="btn btn-sm mt-4" /* Buton aralığını artırdım */
                      onClick={() => setSelectedInstitution(null)}
                      style={{ 
                        backgroundColor: "#f0f0f0", 
                        color: "#333", 
                        border: "none", 
                        padding: '8px 16px', /* Butonu biraz büyüttüm */
                        borderRadius: "5px",
                        fontWeight: "500",
                        fontSize: "13px",
                        transition: "all 0.2s ease",
                        marginTop: "15px" /* Ek margin ekledim */
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e0e0e0"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                    >
                      &larr; Kurum Listesine Dön
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 style={{ color: '#0032A0', marginBottom: '0' }}>
                    {plakaToCity[zoomedCity] || 'Şehir'} Kurumları
                  </h4>
                  <span className="badge" style={{ 
                    backgroundColor: '#0032A0', 
                    color: 'white', 
                    fontSize: '14px',
                    padding: '5px 10px',
                    borderRadius: '10px'
                  }}>
                    {getInstitutionsList().length} tane kurum mevcut
                  </span>
                </div>

                <div className="institution-filter mb-3" style={{
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '8px'
                }}>
                  <label htmlFor="institution-type-filter" className="mb-1 d-block" style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>
                    Kurum Tipine Göre Filtrele:
                  </label>
                  <select 
                    id="institution-type-filter"
                    className="form-select form-select-sm"
                    value={selectedCategory}
                    onChange={(e) => filterByCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '5px',
                      border: '1px solid #ddd',
                      fontSize: '13px'
                    }}
                  >
                    {allCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="institutions-list">
                  {getInstitutionsList().map((institution, index) => (
                    <div 
                      key={`institution-${index}`}
                      className="institution-item"
                      onClick={() => handleInstitutionClick(null, {
                        ...institution,
                        cityName: plakaToCity[zoomedCity]
                      })}
                      style={{
                        padding: '12px 15px',
                        margin: '8px 0',
                        backgroundColor: 'white',
                        border: '1px solid #eee',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                      }}
                    >
                      <div 
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          backgroundColor: getMarkerColor(institution.type),
                          borderRadius: '50%',
                          marginRight: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ flex: '1' }}>
                        <div style={{ fontWeight: '500', color: '#333' }}>{institution.name}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {institution.type}
                        </div>
                      </div>
                      <div>
                        <i className="fas fa-chevron-right" style={{ color: '#ccc', fontSize: '12px' }}></i>
                      </div>
                    </div>
                  ))}
                  
                  {getInstitutionsList().length === 0 && (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#666',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      margin: '20px 0'
                    }}>
                      <div style={{ fontSize: '40px', color: '#ccc', marginBottom: '10px' }}>
                        &#x1F50D;
                      </div>
                      <p style={{ margin: '0', fontWeight: '500' }}>Bu filtreyle kurum bulunamadı</p>
                      <p style={{ fontSize: '13px', margin: '5px 0 0' }}>Farklı bir kurum tipi seçiniz</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div 
          className='map-container' 
          onClick={handleMapClick}
          style={{ 
            width: showSideMenu ? '70%' : '100%', 
            transition: 'all 0.3s ease',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '20px',
            marginBottom: '30px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >

          <div className="title-box" style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: '100',
            minWidth: '180px'
          }}>
            <h3 className="title-box-heading" style={{
              fontWeight: '600',
              fontSize: '1rem',
              color: '#333',
              marginBottom: '2px'
            }}>
              Türkiye'deki Rus Kurumları
            </h3>
            <p className="title-box-subheading" style={{
              fontSize: '0.75rem',
              color: '#666',
              margin: 0
            }}>
              {zoomedCity ? plakaToCity[zoomedCity] : 'Görüntülemek için şehirlere tıklayın'}
            </p>
          </div>

          <div className="map-legend" style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: '100',
            minWidth: '200px',
            fontSize: '0.875rem'
          }}>
            <h3 className="legend-title" style={{
              fontWeight: '600',
              color: '#444',
              marginBottom: '12px',
              paddingBottom: '4px',
              borderBottom: '1px solid #eee'
            }}>Kurum Tipleri</h3>
            
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
              <span className="legend-color city-legend" style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                marginRight: '10px',
                backgroundColor: '#14b8a6',
                border: '1px solid rgba(0,0,0,0.1)'
              }}></span>
              <span className="legend-label" style={{ fontSize: '0.8rem', color: '#555' }}>Şehir (Kurum Sayısı)</span>
            </div>
            
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
              <span className="legend-color" style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                marginRight: '10px',
                backgroundColor: '#DA291C', 
                border: '1px solid rgba(0,0,0,0.1)'
              }}></span>
              <span className="legend-label" style={{ fontSize: '0.8rem', color: '#555' }}>Konsolosluk/Büyükelçilik</span>
            </div>
            
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
              <span className="legend-color" style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                marginRight: '10px',
                backgroundColor: '#0032A0', 
                border: '1px solid rgba(0,0,0,0.1)'
              }}></span>
              <span className="legend-label" style={{ fontSize: '0.8rem', color: '#555' }}>Kültür/Ticaret Kurumları</span>
            </div>
            
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
              <span className="legend-color" style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                marginRight: '10px',
                backgroundColor: '#5C9E31', 
                border: '1px solid rgba(0,0,0,0.1)'
              }}></span>
              <span className="legend-label" style={{ fontSize: '0.8rem', color: '#555' }}>Üniversite/Eğitim</span>
            </div>
          </div>

          <svg ref={svgRef} viewBox="0 0 800 350" className="turkey-svg" style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'pointer'
          }}>
            <rect x="0" y="0" width="800" height="350" fill="transparent" className="zoom-capture-rect" />
            <g ref={gRef}>
              <rect x="0" y="0" width="800" height="350" className="map-background" fill="#ffffff" />
              
              {provincePaths.map((province, index) => {
                if (!province.d || province.d === "") return null;
                
                const cityCode = normalizeCode(province.plaka);
                const centerCount = getCenterCount(cityCode);
                const cityHasRussianCenters = hasRussianCenters(cityCode);
                
                return (
                  <g key={cityCode || `province-${index}`} className="city-group">
                    <path
                      id={cityCode}
                      title={province.ilismi}
                      className="city-path"
                      d={province.d}
                      style={pathStyles(cityCode)}
                      onMouseEnter={() => setHoverCity(cityCode)}
                      onMouseLeave={() => setHoverCity(null)}
                    />
                    
                    {cityHasRussianCenters && !zoomedCity && (
                      (() => {
                        const cityElement = document.getElementById(cityCode);
                        if (!cityElement) return null;
                        
                        let cx = 300, cy = 150;
                        
                        try {
                          const bbox = cityElement.getBBox();
                          cx = bbox.x + bbox.width / 2;
                          cy = bbox.y + bbox.height / 2;
                        } catch (e) {
                          console.error(`Error getting bbox for ${cityCode}:`, e);
                        }
                        
                        let circleOffsetX = 0;
                        let circleOffsetY = 0;
                        let textOffsetX = 0;
                        let textOffsetY = 4;
                        
                        if (cityCode === "35") {
                          circleOffsetX = 3;
                          circleOffsetY = 10; 
                          textOffsetX = 3; 
                          textOffsetY = 14;
                        }
                        
                        else if (cityCode === "06") {
                          circleOffsetX = 5; 
                          circleOffsetY = -5; 
                          textOffsetX = 5;
                          textOffsetY = -1;
                        }
                        
                        else if (cityCode === "38") {
                          circleOffsetX = -5; 
                          circleOffsetY = -8; 
                          textOffsetX = -5;
                          textOffsetY = -4;
                        }
                        
                        else if (cityCode === "42") {
                          circleOffsetX = -5; 
                          circleOffsetY = -5; 
                          textOffsetX = -5;
                          textOffsetY = -1;
                        }
                        
                        else if (cityCode === "04") {
                          circleOffsetX = -15; 
                          circleOffsetY = -10; 
                          textOffsetX = -15;
                          textOffsetY = -6;
                        }
                        
                        else if (cityCode === "07") {
                          circleOffsetY = -15; 
                          textOffsetY = -11;
                        }
                        
                        return (
                          <g onClick={() => handleCityClick(cityCode)}>
                            <circle
                              cx={cx + circleOffsetX}
                              cy={cy + circleOffsetY}
                              r="10"
                              fill="#14b8a6" 
                              fillOpacity="0.8"
                              stroke="white"
                              strokeWidth="2"
                              style={{ 
                                cursor: 'pointer', 
                                transition: 'all 0.2s ease',
                              }}
                            />
                            <text
                              x={cx + textOffsetX}
                              y={cy + textOffsetY}
                              textAnchor="middle"
                              fill="white"
                              fontSize="10"
                              fontWeight="bold"
                              style={{ pointerEvents: 'none' }}
                            >
                              {centerCount}
                            </text>
                          </g>
                        );
                      })()
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
          
          <div className="zoom-instructions" style={{
            position: 'absolute',
            bottom: '60px',
            right: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            fontSize: '0.7rem',
            padding: '3px 8px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: '90',
            display: 'none' 
          }}>
            Yakınlaşmak için iki parmağınızla uzaklaştırın.
          </div>

          {!showSideMenu && zoomedCity && (
            <div className="info-title" style={{ 
              position: 'absolute', 
              top: '100px', 
              left: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '8px',
              borderRadius: '5px',
              boxShadow: '0 0 10px rgba(0,0,0,0.2)',
              borderLeft: '4px solid #14b8a6',
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              fontSize: '12px',
              color: '#555'
            }}>
              <div style={{ margin: '0 0 3px', color: '#14b8a6', fontSize: '14px', fontWeight: 'bold' }}>
                {plakaToCity[zoomedCity]}
              </div>
              <p style={{ fontSize: '11px', margin: '2px 0' }}>Bilgi için kurum noktalarına tıklayınız</p>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .map-container {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 30px;
          position: relative;
          height: 600px;
        }
        
        .side-menu {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        /* City path transitions */
        .city-path {
          transition: fill 0.15s ease-in-out, stroke-width 0.15s ease-in-out, transform 0.2s ease-out;
          cursor: pointer;
        }
        
        .city-path:hover {
          fill: #DA291C !important;
        }
        
        /* Facility Points */
        .facility-point {
          transition: r 0.2s ease-out, fill 0.15s ease-in-out, stroke-width 0.15s ease-in-out;
        }
        
        .facility-point:hover {
          stroke-width: 2;
        }
        
        /* Mobile Touch Instructions */
        @media (pointer: coarse) {
          .zoom-instructions {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TurkeyMap;
