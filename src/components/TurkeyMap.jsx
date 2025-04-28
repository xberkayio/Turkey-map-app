import React, { useState, useRef, useEffect } from 'react';
import pathData from '../data/path.json';
import russianInstitutionsData from '../data/russian_institutions.json';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';

const TurkeyMap = () => {
  const [provincePaths, setProvincePaths] = useState([]);  
  const [locationMappings, setLocationMappings] = useState({});
  const [russianCenters, setRussianCenters] = useState([]);
  const [russianCentersData, setRussianCentersData] = useState({});
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [hoverCity, setHoverCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [zoomedCity, setZoomedCity] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [mapViewBox, setMapViewBox] = useState("0 0 800 350");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(1);  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Hepsi');
  const [suggestions, setSuggestions] = useState([]);
  const [allCategories, setAllCategories] = useState(['Hepsi']);
  const mapRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setProvincePaths(pathData);
    console.log("Loaded path data:", pathData);
  }, []);

  useEffect(() => {
    console.log("Loading Russian institutions from JSON:", russianInstitutionsData);
    
    setRussianCentersData(russianInstitutionsData);
    
    // Kurum tiplerini toplama
    const categories = new Set(['Hepsi']);
    Object.values(russianInstitutionsData).forEach(cityInstitutions => {
      cityInstitutions.forEach(institution => {
        if (institution.type) {
          categories.add(institution.type);
        }
      });
    });
    
    setAllCategories(Array.from(categories));
    
    // Hangi şehir kodları mevcut, görelim
    console.log("Mevcut şehir kodları:", Object.keys(russianInstitutionsData));
    
    // Path datası ile karşılaştır
    if (provincePaths.length > 0) {
      const mapCityCodes = provincePaths.map(p => p.plaka).filter(Boolean);
      console.log("Harita şehir kodları:", mapCityCodes);
      
      // Eşleşmeyen kodları bul
      const unmatchedCodes = Object.keys(russianInstitutionsData).filter(
        code => !mapCityCodes.includes(code)
      );
      
      if (unmatchedCodes.length > 0) {
        console.warn("Eşleşmeyen şehir kodları:", unmatchedCodes);
      }
    }
    
    filterCentersByCategory('Hepsi', russianInstitutionsData);
    
  }, [provincePaths]);
  const filterCentersByCategory = (category, data = russianCentersData) => {
    setSelectedCategory(category);
    
    if (category === 'Hepsi') {
      setFilteredCenters(data);
    } else {
      const filtered = {};
      
      Object.keys(data).forEach(sehirKodu => {
        const filteredInstitutions = data[sehirKodu].filter(
          institution => institution.type === category
        );
        
        if (filteredInstitutions.length > 0) {
          filtered[sehirKodu] = filteredInstitutions;
        }
      });
      
      setFilteredCenters(filtered);
    }
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
    Object.keys(russianCentersData).forEach(cityCode => {
      russianCentersData[cityCode].forEach(institution => {
        const cityElement = document.getElementById(cityCode);
        const cityName = cityElement ? cityElement.getAttribute('title') : cityCode;
        
        allInstitutions.push({
          ...institution,
          cityCode,
          cityName
        });
      });
    });
    
    const matches = allInstitutions.filter(institution => {
      if (selectedCategory !== 'Hepsi' && institution.type !== selectedCategory) {
        return false;
      }
      
      return (
        institution.name.toLowerCase().includes(searchTermLower) ||
        (institution.description && institution.description.toLowerCase().includes(searchTermLower)) ||
        (institution.cityName && institution.cityName.toLowerCase().includes(searchTermLower)) ||
        (institution.address && institution.address.toLowerCase().includes(searchTermLower))
      );
    });
    
    setSuggestions(matches.slice(0, 5));
  };
  
  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch({ target: { value: searchTerm } });
    }
  }, [selectedCategory]);

  const handleSuggestionClick = (institution) => {
    setSearchTerm('');
    setSuggestions([]);
    
    // If already zoomed in to a different city, don't allow direct transition
    if (zoomedCity && zoomedCity !== institution.cityCode) {
      return;
    }
    
    handleCityClick(institution.cityCode);
    
    setTimeout(() => {
      const fullInstitution = russianCenters.find(center => 
        center.name === institution.name && 
        center.cityCode === institution.cityCode
      );
      
      if (fullInstitution) {
        handleInstitutionClick(null, fullInstitution);
      }
    }, 1000);
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
      // Burada fare tekerleği 
      .filter(event => {
        // Çift tıklama
        return !event.type.includes('wheel') && 
               !event.type.includes('mouse') &&
               !event.type.includes('dblclick');
      });

    svg.call(zoomHandler);
    zoomBehaviorRef.current = zoomHandler;
    
    // Harita içinde genel cursor stilini ayarla - her zaman pointer olsun
    svg.style("cursor", "pointer");
    
    svg.on('dblclick', event => {
      event.preventDefault();
    });
    
    // Başlangıçta zoom'u ayarla
    svg.transition()
      .duration(750)
      .call(zoomHandler.transform, zoomIdentity);
      
    return () => {
      svg.on('.zoom', null);
      svg.on('dblclick', null);
    };
  }, []);

  // Kurum türüne göre renk belirleme - Rus bayrağı renkleri kullanılıyor
  const getMarkerColor = (type) => {
    switch(type) {
      case 'Büyükelçilik': return '#DA291C'; // Kırmızı
      case 'Konsolosluk': return '#DA291C'; // Kırmızı
      case 'Ticaret': return '#0032A0'; // Mavi
      case 'Enerji': return '#0032A0'; // Mavi
      case 'Kültür': return '#0032A0'; // Mavi
      case 'Üniversite': return '#5C9E31'; // Yeşil
      default: return '#525252';
    }
  };

  // Modern stil için şehir path stilleri
  const pathStyles = (cityID) => {
    const isSelected = selectedCity === cityID;
    const isHovered = hoverCity === cityID;
    const isZoomed = zoomedCity && zoomedCity !== cityID;
    
    return {
      cursor: "pointer",
      transition: "all 0.3s ease-in-out",
      transform: isHovered ? 'scale(1.008)' : 'scale(1)',
      fill: isSelected ? '#0032A0' // Mavi
           : isHovered ? '#DA291C' // Kırmızı 
           : '#a0aec0', // Modern gri
      stroke: '#4a5568', // Kenar rengi
      strokeWidth: 0.5,
      opacity: isZoomed ? 0.3 : 1,
    };
  };
  
  // Coğrafi koordinatları SVG koordinatlarına dönüştürme - Noktaların il içinde olmasını sağlamak için geliştirilmiş versiyon
  const calculateSVGCoordinates = () => {
    if (!svgRef.current) return;
    
    const newMappings = {};
    const newCenters = [];
    
    console.log("Calculating coordinates for cities:", Object.keys(filteredCenters));
    
    // Her il için
    Object.keys(filteredCenters).forEach(sehirKodu => {
      const cityPath = document.getElementById(sehirKodu);
      if (!cityPath) {
        console.warn(`City path element not found for code: ${sehirKodu}`);
        // İl ID'sini kontrol et - bazen format uyuşmazlığı olabilir (örn. "1" vs "01")
        let matchedCityPath = null;
        
        // Tek haneli plakaları iki haneli formata çevirmeyi dene
        if (sehirKodu.length === 1) {
          const paddedCode = "0" + sehirKodu;
          matchedCityPath = document.getElementById(paddedCode);
          if (matchedCityPath) {
            console.log(`Found matching city with padded code: ${paddedCode}`);
          }
        } 
        // İki haneli plakaları tek haneli formata çevirmeyi dene
        else if (sehirKodu.length === 2 && sehirKodu.startsWith("0")) {
          const unpaddedCode = sehirKodu.substring(1);
          matchedCityPath = document.getElementById(unpaddedCode);
          if (matchedCityPath) {
            console.log(`Found matching city with unpadded code: ${unpaddedCode}`);
          }
        }
        
        // Eğer alternatif format bulunamazsa, bu şehri atla
        if (!matchedCityPath) {
          console.error(`Cannot find city path for code: ${sehirKodu} - skipping`);
          return;
        }
        
        // Eşleşen yolu kullan
        cityPath = matchedCityPath;
      }
      
      try {
        const bbox = cityPath.getBBox();
        
        // İlin merkezi
        const cityCenter = {
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2
        };
        
        // Her kurumu il sınırları içinde uygun bir pozisyona yerleştirme
        const institutions = filteredCenters[sehirKodu];
        
        // İl için güvenli bir yarıçap belirle
        // İl şeklinin daha iyi temsil edilmesi için daha küçük bir yarıçap kullanalım
        const safeRadius = Math.min(bbox.width, bbox.height) / 4;
        
        // Her kurum için pozisyon hesapla
        institutions.forEach((institution, index) => {
          // Kurum için benzersiz bir ID oluştur
          const institutionId = `${sehirKodu}-${index}`;
          
          // Kurumun konumunu belirle (merkeze yakın farklı noktalarda)
          // Daha düzenli dağılım için açı ve mesafeyi ayarla
          const totalInstitutions = institutions.length;
          
          // Daha dengeli bir dağılım için açı hesapla
          let angle;
          if (totalInstitutions === 1) {
            // Tek kurum varsa ortaya koy
            angle = 0;
          } else {
            // Kurumları çevrede düzenli dağıt
            angle = (2 * Math.PI * index) / totalInstitutions;
          }
          
          const distanceRatio = 0.8 + (0.1 * (index % 3)); 
          const radius = safeRadius * distanceRatio;
          
          const position = {
            x: cityCenter.x + radius * Math.cos(angle),
            y: cityCenter.y + radius * Math.sin(angle)
          };
          
          const paddedX = Math.min(Math.max(position.x, bbox.x + 5), bbox.x + bbox.width - 5);
          const paddedY = Math.min(Math.max(position.y, bbox.y + 5), bbox.y + bbox.height - 5);
          
          position.x = paddedX;
          position.y = paddedY;
          
          newMappings[institutionId] = position;
          
          newCenters.push({
            ...institution,
            id: institutionId,
            cityCode: sehirKodu,
            location: position
          });
        });
      } catch (e) {
        console.error(`Error processing city ${sehirKodu}:`, e);
      }
    });
    
    setLocationMappings(newMappings);
    setRussianCenters(newCenters);
  };

  // Şehre tıklandığında yakınlaştırma işlemi
  const handleCityClick = (cityID) => {
    // If we're already zoomed into a city and it's not the same city, prevent the click
    if (zoomedCity && zoomedCity !== cityID) {
      // Silently prevent clicking on other cities
      return;
    }
    
    if (zoomedCity === cityID) {
      resetMap();
    } else {
      setSelectedCity(cityID);
      setZoomedCity(cityID);
      setShowSideMenu(true); // Şehre zoom yapıldığında sol menüyü otomatik göster
      
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

  const handleInstitutionClick = (e, institution) => {
    if (e) e.stopPropagation(); 

    setSelectedInstitution(institution);
    setShowSideMenu(true);
  };

  // Haritadan başka bir yere tıklandığında yan menüyü kapat
  const handleMapClick = (e) => {
    // Eğer yakınlaştırılmış bir şehir varsa, tıklamaları farklı işle
    if (zoomedCity) {
      // Kuruma tıklama kontrolü - gRef içindeki tıklamaları engelleme
      const isInsideG = e.target.closest('g[ref]') === gRef.current;
      
      // Eğer nokta/kurum elemanına tıklanmadıysa (arka plana tıklandı) ve yan menü açıksa kapat
      if (isInsideG && showSideMenu) {
        setSelectedInstitution(null);
        // Yan menüyü kapatma - zoom varken daima göster
        // setShowSideMenu(false);
      }
      
      return; // Harita yakınlaştırılmışken diğer işlemleri engelle
    }
    
    // Eğer doğrudan haritaya tıklanmışsa yan menüyü kapat
    setSelectedInstitution(null);
    setShowSideMenu(false);
  };

  // Yan menüyü kapatma butonu işlevi
  const handleCloseSideMenu = (e) => {
    e.stopPropagation();
    setSelectedInstitution(null);
    // Eğer zoom yapılmışsa yan menüyü kapatma, sadece seçili kurumu temizle
    if (!zoomedCity) {
      setShowSideMenu(false);
    }
  };

  // Ana haritaya geri dönme
  const resetMap = () => {
    setZoomedCity(null);
    setSelectedCity(null); // Seçili şehir durumunu da sıfırla
    setMapViewBox("0 0 800 350");
    setSelectedInstitution(null);
    setShowSideMenu(false);
    setHoverCity(null); // Hover durumunu da temizleyelim

    // D3 zoom ile sıfırla
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
  
  // Debounce fonksiyonu
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  useEffect(() => {
    if (provincePaths.length > 0 && Object.keys(filteredCenters).length > 0) {
      // Konsolda basit bir özet göster
      console.log(`${provincePaths.length} il ve ${Object.keys(filteredCenters).length} şehirde Rus kurumu var`);
      
      // Şehir plaka formatlarını kontrol et
      const mapPlakaFormats = provincePaths.map(p => ({
        plaka: p.plaka,
        ismi: p.ilismi,
        format: p.plaka ? (p.plaka.startsWith('0') ? 'padded' : 'unpadded') : 'missing'
      }));
      
      console.log("Harita plaka formatları:", mapPlakaFormats);
      
      const timer = setTimeout(() => {
        calculateSVGCoordinates();
      }, 1000); 
      
      return () => clearTimeout(timer);
    }
  }, [provincePaths, filteredCenters]); 

  // Fix the event listener management to properly clean up and prevent multiple listeners
  useEffect(() => {
    if (svgRef.current && gRef.current) {
      const cityPaths = document.querySelectorAll('.city-path');
      
      // Create a map of event listeners to properly remove them later
      const clickHandlers = new Map();
      
      cityPaths.forEach(cityPath => {
        const handler = (e) => {
          if (e.target === cityPath && !e.defaultPrevented) {
            handleCityClick(cityPath.id);
          }
        };
        
        // Store the handler for later removal
        clickHandlers.set(cityPath, handler);
        
        // Add the event listener
        cityPath.addEventListener('click', handler);
      });
      
      return () => {
        // Properly remove all listeners using the stored handlers
        cityPaths.forEach(cityPath => {
          const handler = clickHandlers.get(cityPath);
          if (handler) {
            cityPath.removeEventListener('click', handler);
          }
        });
      };
    }
  }, [zoomedCity, provincePaths]); 

  useEffect(() => {
    setSelectedInstitution(null);
    if (zoomedCity) {
      setShowSideMenu(true);
    } else {
      setShowSideMenu(false);
    }
  }, [zoomedCity]);

  const isDataEmpty = provincePaths.length === 0 || 
                      provincePaths[0]?.d === "" || 
                      !provincePaths[0]?.d;

  // Bu fonksiyonu filteredCenters'ı kullanacak şekilde değiştirelim
  const getInstitutionsList = () => {
    if (!zoomedCity || !filteredCenters[zoomedCity]) return [];
    return filteredCenters[zoomedCity];
  };

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
            onChange={(e) => filterCentersByCategory(e.target.value)}
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
                  key={`${suggestion.cityCode}-${index}`}
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
                  {selectedInstitution.image ? (
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
                          console.log("Resim yüklenemedi:", selectedInstitution.image);
                          e.target.style.display = 'none';
                          e.target.parentNode.style.display = 'none';
                          const fallbackIcon = document.getElementById('fallback-icon-' + selectedInstitution.id);
                          if (fallbackIcon) {
                            fallbackIcon.style.display = 'flex';
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  
                  <div 
                    id={`fallback-icon-${selectedInstitution.id}`}
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      backgroundColor: getMarkerColor(selectedInstitution.type),
                      borderRadius: '50%',
                      margin: '0 auto 10px',
                      display: selectedInstitution.image ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  >
                    {selectedInstitution.type.charAt(0)}
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
                    <strong>Şehir:</strong> {document.getElementById(zoomedCity)?.getAttribute('title') || ''}
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
                  
                  {/* Enlem/boylam kısmını kaldırdık */}
                  
                  {selectedInstitution.website && (
                    <div className="mb-3 text-center">
                      <a 
                        href={`https://${selectedInstitution.website}`} 
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
                      className="btn btn-sm" 
                      onClick={() => setSelectedInstitution(null)}
                      style={{ 
                        backgroundColor: "#f0f0f0", 
                        color: "#333", 
                        border: "none", 
                        padding: "6px 12px",
                        borderRadius: "5px",
                        fontWeight: "500",
                        fontSize: "13px",
                        transition: "all 0.2s ease"
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
                    {document.getElementById(zoomedCity)?.getAttribute('title') || 'Şehir'} Kurumları
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
                    onChange={(e) => filterCentersByCategory(e.target.value)}
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
                      key={`${zoomedCity}-${index}`}
                      className="institution-item"
                      onClick={() => handleInstitutionClick(null, {
                        ...institution,
                        id: `${zoomedCity}-${index}`,
                        cityCode: zoomedCity
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
              {zoomedCity ? document.getElementById(zoomedCity)?.getAttribute('title') : 'Görüntülemek için şehirlere tıklayın'}
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
                const cityCode = province.plaka;
                const hasRussianCenters = cityCode && filteredCenters[cityCode];
                const centerCount = hasRussianCenters ? filteredCenters[cityCode].length : 0;
                
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
                      onClick={(e) => {
                        // Let the event listener handle it
                        // Empty function to allow the event listener in useEffect to work
                      }} 
                    />
                    
                    {hasRussianCenters && !zoomedCity && (
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
                        
                        return (
                          <g onClick={() => handleCityClick(cityCode)}>
                            <circle
                              cx={cx}
                              cy={cy}
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
                              x={cx}
                              y={cy + 4}
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
                {document.getElementById(zoomedCity)?.getAttribute('title')}
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