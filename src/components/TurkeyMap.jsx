import React, { useState, useRef, useEffect } from 'react';
import pathData from '../data/path.json';
import ruseviankara from '../images/ruseviankara.png';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';

const TurkeyMap = () => {
  // İl bazında Rus kurumları (gerçek coğrafi koordinatlarla)
  const sehirRusya = {
    "TR06": [
      { name: 'Rus Evi Ankara Русский дом в Анкаре', geoCoords: { lat: 39.8677048, lng: 32.8155985 }, description: 'Rossotrudniçestvo Türkiye Temsilciliği', type: 'Büyükelçilik', address: 'Rabindranath Tagore Cd. No:68, 06550 Çankaya/Ankara', website: 'turkiye.rs.gov.ru', image: ruseviankara },
      { name: 'Rus Eğitim Enstitüsü', geoCoords: { lat: 39.9179, lng: 32.8610 }, description: 'Rusça dil eğitimi ve kültürel etkinlikler düzenleyen eğitim kurumu.', type: 'Kültür', address: 'Ankara Merkez', website: 'rusedu.com.tr' },
      { name: 'Rus Bilim Akademisi', geoCoords: { lat: 39.9420, lng: 32.8543 }, description: 'Ortak bilimsel projeler yürüten Rus araştırma kurumu şubesi.', type: 'Kültür', address: 'Ankara Üniversitesi Kampüsü', website: 'rusbilim.org.tr' }
    ],
    "TR01": [
      { name: 'Adana Rus Kültür Merkezi', geoCoords: { lat: 36.9914, lng: 35.3308 }, description: 'Adana ilinde faaliyet gösteren Rus kültür merkezi.', type: 'Kültür', address: 'Adana Merkez', website: 'adanaruskultur.com' }
    ],
    "TR34": [
      { name: 'Rusya Başkonsolosluğu İstanbul', geoCoords: { lat: 41.0362, lng: 28.9787 }, description: 'İstanbul\'daki Rusya Federasyonu Başkonsolosluğu', type: 'Konsolosluk', address: 'İstiklal Caddesi No: 443, Beyoğlu, İstanbul', website: 'istanbul.mid.ru/tr/' },
      { name: 'Rus Ticaret Temsilciliği', geoCoords: { lat: 41.0565, lng: 28.9886 }, description: 'İstanbul\'daki Rusya Federasyonu Ticaret Temsilciliği', type: 'Ticaret', address: 'Halaskargazi Cad. No: 349-1, Şişli, İstanbul', website: 'rustrade.org.tr/' }
    ],
    "TR35": [
      { name: 'İzmir Rus Derneği', geoCoords: { lat: 38.4192, lng: 27.1287 }, description: 'İzmir\'de yaşayan Ruslar için kültürel ve sosyal etkinlikler düzenleyen merkez.', type: 'Kültür', address: 'İzmir Merkez', website: 'izmirrusdernek.org' }
    ],
    "TR07": [
      { name: 'Rusya Başkonsolosluğu Antalya', geoCoords: { lat: 36.8969, lng: 30.7133 }, description: 'Antalya\'daki Rusya Federasyonu Başkonsolosluğu', type: 'Konsolosluk', address: 'Park Sok. No:30, Yeşilbahçe Mah., Antalya', website: 'antalya.mid.ru/tr/' },
      { name: 'Rus Dostluk Derneği', geoCoords: { lat: 36.8872, lng: 30.7029 }, description: 'Antalya\'da Rus-Türk dostluk ilişkilerini geliştiren sivil toplum kuruluşu.', type: 'Kültür', address: 'Antalya Merkez', website: 'rusdostluk.org' }
    ]
  };

  // State değişkenleri
  const [provincePaths, setProvincePaths] = useState([]);  
  const [locationMappings, setLocationMappings] = useState({});
  const [russianCenters, setRussianCenters] = useState([]);

  // İllerdeki Rus kurumu sayıları
  const rusKurumSayilari = {};
  Object.keys(sehirRusya).forEach(sehirKodu => {
    rusKurumSayilari[sehirKodu] = sehirRusya[sehirKodu].length;
  });

  // UI state
  const [hoverCity, setHoverCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [zoomedCity, setZoomedCity] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [mapViewBox, setMapViewBox] = useState("0 0 800 350");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(1);
  
  // Referanslar
  const mapRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

  // Path verilerini yükle
  useEffect(() => {
    setProvincePaths(pathData);
    console.log("Loaded path data:", pathData);
  }, []);

  // D3 zoom davranışı ayarla
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = select(svgRef.current);
    const g = select(gRef.current);

    const zoomHandler = zoom()
      .scaleExtent([0.8, 5]) // Min ve max zoom seviyesi
      .translateExtent([[0, 0], [800, 350]]) // Kaydırma sınırları
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setCurrentZoomLevel(event.transform.k); // Zoom seviyesini güncelle
      });

    svg.call(zoomHandler);
    zoomBehaviorRef.current = zoomHandler;
    
    // Başlangıçta zoom'u ayarla
    svg.transition()
      .duration(750)
      .call(zoomHandler.transform, zoomIdentity);
      
    return () => {
      svg.on('.zoom', null);
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
  
  // Coğrafi koordinatları SVG koordinatlarına dönüştürme
  const calculateSVGCoordinates = () => {
    if (!svgRef.current) return;
    
    const newMappings = {};
    const newCenters = [];
    
    // Her il için
    Object.keys(sehirRusya).forEach(sehirKodu => {
      const cityPath = document.getElementById(sehirKodu);
      if (!cityPath) return;
      
      try {
        const bbox = cityPath.getBBox();
        const cityCenter = {
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2
        };
        
        // Her kurumu il sınırları içinde uygun bir pozisyona yerleştirme
        const institutions = sehirRusya[sehirKodu];
        institutions.forEach((institution, index) => {
          // Kurum için benzersiz bir ID oluştur
          const institutionId = `${sehirKodu}-${index}`;
          
          // Kurumun konumunu belirle (merkeze yakın farklı noktalarda)
          const angle = (2 * Math.PI * index) / institutions.length;
          const radius = bbox.width > bbox.height ? bbox.height / 3 : bbox.width / 3;
          
          const position = {
            x: cityCenter.x + radius * Math.cos(angle),
            y: cityCenter.y + radius * Math.sin(angle)
          };
          
          // Konum eşlemesini kaydet
          newMappings[institutionId] = position;
          
          // Kurum verilerini kopyala ve konumu ekle
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
    if (zoomedCity === cityID) {
      // Eğer zaten yakınlaştırılmış şehre tıklanmışsa, uzaklaştır
      resetMap();
    } else {
      setSelectedCity(cityID);
      setZoomedCity(cityID);
      setShowSideMenu(false);
      
      // Şehrin SVG path elementini bul
      const cityPath = document.getElementById(cityID);
      if (cityPath && zoomBehaviorRef.current) {
        const bbox = cityPath.getBBox();
        
        // D3 zoom ile daha yumuşak yakınlaştırma
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

  // Rus kurumuna tıklama işlemi
  const handleInstitutionClick = (e, institution) => {
    if (e) e.stopPropagation(); // Tıklamanın il tıklamasını tetiklememesi için
    
    // Zaten seçiliyse yan menüyü kapat, değilse aç
    if (selectedInstitution && selectedInstitution.id === institution.id && showSideMenu) {
      setSelectedInstitution(null);
      setShowSideMenu(false);
    } else {
      setSelectedInstitution(institution);
      setShowSideMenu(true);
      
      // Eğer şehir yakınlaştırılmışsa, haritayı sağa kaydır
      if (zoomedCity) {
        // Şehrin SVG path elementini bul
        const cityPath = document.getElementById(zoomedCity);
        if (cityPath) {
          const bbox = cityPath.getBBox();
          
          // Yan menü için haritayı sağa kaydır, ama yakınlaştırma seviyesini koru
          const padding = 50;
          const viewBoxParts = mapViewBox.split(' ').map(Number);
          
          // ViewBox değerlerini al
          let [vbX, vbY, vbWidth, vbHeight] = viewBoxParts;
          
          // Yakınlaştırma seviyesini koruyarak x koordinatını sağa kaydır
          // Yan menü genişliği yaklaşık olarak görünüm genişliğinin %30'u kadar
          const sideMenuWidth = vbWidth * 0.3;
          vbX = vbX + (sideMenuWidth / 2);
          
          // Yeni viewBox oluştur
          const viewBox = `${vbX} ${vbY} ${vbWidth} ${vbHeight}`;
          setMapViewBox(viewBox);
        }
      }
    }
  };

  // Haritadan başka bir yere tıklandığında yan menüyü kapat
  const handleMapClick = (e) => {
    // Eğer doğrudan haritaya tıklanmışsa yan menüyü kapat
    setSelectedInstitution(null);
    setShowSideMenu(false);
    
    // Şehir yakınlaştırılmışsa, haritayı normal yerine geri getir
    if (zoomedCity) {
      const cityPath = document.getElementById(zoomedCity);
      if (cityPath) {
        const bbox = cityPath.getBBox();
        const padding = 50;
        const viewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding*2} ${bbox.height + padding*2}`;
        setMapViewBox(viewBox);
      }
    }
  };

  // Yan menüyü kapatma butonu işlevi
  const handleCloseSideMenu = (e) => {
    e.stopPropagation();
    setSelectedInstitution(null);
    setShowSideMenu(false);
    
    // Şehir yakınlaştırılmışsa, haritayı normal yerine geri getir
    if (zoomedCity) {
      const cityPath = document.getElementById(zoomedCity);
      if (cityPath) {
        const bbox = cityPath.getBBox();
        const padding = 50;
        const viewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding*2} ${bbox.height + padding*2}`;
        setMapViewBox(viewBox);
      }
    }
  };

  // Ana haritaya geri dönme
  const resetMap = () => {
    setZoomedCity(null);
    setMapViewBox("0 0 800 350");
    setSelectedInstitution(null);
    setShowSideMenu(false);

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
  
  // Kurum pozisyonlarını hesapla
  useEffect(() => {
    // Şehir elementleri hazır olduğunda konum hesaplaması yap
    if (provincePaths.length > 0) {
      const timer = setTimeout(() => {
        calculateSVGCoordinates();
      }, 1000); // Daha uzun bekle - SVG elementlerinin oluşması için
      
      return () => clearTimeout(timer);
    }
  }, [provincePaths]); // provincePaths değiştiğinde tekrar hesapla

  useEffect(() => {
    // Başka bir şehre tıklandığında yan menüyü kapat
    setSelectedInstitution(null);
    setShowSideMenu(false);
  }, [zoomedCity]);

  // Debug için boş data kontrolü
  const isDataEmpty = provincePaths.length === 0 || 
                      provincePaths[0]?.d === "" || 
                      !provincePaths[0]?.d;

  // Görünürlüğü zoom seviyesine göre belirleme
  const showCityLabels = currentZoomLevel < 1.5;
  const showFacilityPoints = currentZoomLevel > 1.5;

  return (
    <div className='mt-4'>
      <h2 className="text-center mb-4">Türkiye'deki Rus Kurumları Haritası</h2>
      
      {zoomedCity && (
        <button 
          className="btn btn-sm mb-3"
          onClick={resetMap}
          style={{ 
            backgroundColor: "#0032A0", // Rus bayrağı mavi
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

      {/* Debug bilgisi */}
      {isDataEmpty && (
        <div className="alert alert-warning">
          <strong>Uyarı:</strong> path.json dosyası ya yüklenemedi ya da boş veri içeriyor. 
          Lütfen dosyanın doğru formatta olduğunu kontrol edin.
        </div>
      )}
      
      {/* Modern Harita Konteyneri Stili */}
      <div className='position-relative' style={{ display: 'flex' }}>
        {/* Yan Menü */}
        {showSideMenu && selectedInstitution && (
          <div className='side-menu' style={{
            width: '30%',
            minWidth: '250px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            padding: '20px',
            marginRight: '15px',
            height: zoomedCity ? '600px' : 'auto',
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
                backgroundColor: "#DA291C", // Rus bayrağı kırmızı
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
                  />
                </div>
              ) : (
                <div 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    backgroundColor: getMarkerColor(selectedInstitution.type),
                    borderRadius: '50%',
                    margin: '0 auto 10px',
                    display: 'flex',
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
              )}
              <h5 style={{ color: '#333' }}>{selectedInstitution.name}</h5>
              <div style={{ 
                backgroundColor: getMarkerColor(selectedInstitution.type),
                color: '#FFFFFF', // Rus bayrağı beyaz
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
              
              {selectedInstitution.geoCoords && (
                <div className="mb-3">
                  <h6 style={{ color: '#0032A0', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>Coğrafi Koordinatlar</h6>
                  <p className="mb-1">
                    <strong>Enlem:</strong> {selectedInstitution.geoCoords.lat}
                  </p>
                  <p className="mb-1">
                    <strong>Boylam:</strong> {selectedInstitution.geoCoords.lng}
                  </p>
                </div>
              )}
              
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
            </div>
          </div>
        )}
        
        {/* Harita Bölümü - Modern UI */}
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
            overflow: 'hidden'  // Zoom ve pan için önemli
          }}
        >
          {/* Harita Kontrolleri */}
          <div className="map-controls" style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            zIndex: '100',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'white',
            padding: '6px',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}>
            <button
              className="map-control-btn reset-btn"
              onClick={resetMap}
              title="Haritayı Sıfırla"
              style={{
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginRight: '8px',
                color: '#555',
                transition: 'background-color 0.2s, border-color 0.2s'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v6h6"></path>
                <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
                <path d="M21 22v-6h-6"></path>
                <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
              </svg>
            </button>
            
            <div className="zoom-indicator-wrapper" style={{
              width: '64px',
              height: '6px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div
                className="zoom-indicator-level"
                style={{
                  height: '100%',
                  backgroundColor: '#14b8a6',
                  width: `${((currentZoomLevel - 0.8) / (5 - 0.8)) * 100}%`,
                  transition: 'width 0.15s linear',
                  borderRadius: '3px'
                }}
              ></div>
            </div>
          </div>

          
          {/* Başlık Kutusu */}
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

          {/* Lejant */}
          <div className="map-legend" style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: '100',
            minWidth: '150px',
            fontSize: '0.875rem'
          }}>
            <h3 className="legend-title" style={{
              fontWeight: '600',
              color: '#444',
              marginBottom: '8px',
              paddingBottom: '4px',
              borderBottom: '1px solid #eee'
            }}>Lejant</h3>
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
              <span className="legend-color city-legend" style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                marginRight: '8px',
                backgroundColor: '#14b8a6',
                border: '1px solid rgba(0,0,0,0.1)'
              }}></span>
              <span className="legend-label" style={{ fontSize: '0.75rem', color: '#555' }}>Şehir & Kurum Sayısı</span>
            </div>
            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
              <span className="legend-color facility-legend" style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                marginRight: '8px',
                backgroundColor: '#DA291C',
                border: '1px solid rgba(0,0,0,0.1)'
              }}></span>
              <span className="legend-label" style={{ fontSize: '0.75rem', color: '#555' }}>Rus Kurumu</span>
            </div>
          </div>

          {/* SVG Harita Alanı */}
          <svg ref={svgRef} viewBox="0 0 800 350" className="turkey-svg" style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'move'
          }}>
            <rect x="0" y="0" width="800" height="350" fill="transparent" className="zoom-capture-rect" />
            <g ref={gRef}>
            <rect x="0" y="0" width="800" height="350" className="map-background" fill="#ffffff" />
              
              {/* Şehirleri JSON'dan map ile oluşturma */}
              {provincePaths.map((province, index) => {
                const cityCode = province.plaka;
                const hasRussianCenters = cityCode && sehirRusya[cityCode];
                const centerCount = hasRussianCenters ? sehirRusya[cityCode].length : 0;
                
                return (
                  <g key={cityCode || `province-${index}`} className="city-group">
                    {/* Şehir yolu */}
                    <path
                      id={cityCode}
                      title={province.ilismi}
                      className="city-path"
                      d={province.d}
                      style={pathStyles(cityCode)}
                      onMouseEnter={() => setHoverCity(cityCode)}
                      onMouseLeave={() => setHoverCity(null)}
                      onClick={() => handleCityClick(cityCode)}
                    />
                    
                    {/* Şehir merkezi marker (sadece Rus kurumu olan şehirler için) */}
                    {hasRussianCenters && !zoomedCity && (
                      (() => {
                        // Şehir elementini bul ve merkezini hesapla
                        const cityElement = document.getElementById(cityCode);
                        if (!cityElement) return null;
                        
                        let cx = 300, cy = 150; // Varsayılan
                        
                        try {
                          const bbox = cityElement.getBBox();
                          cx = bbox.x + bbox.width / 2;
                          cy = bbox.y + bbox.height / 2;
                        } catch (e) {
                          console.error(`Error getting bbox for ${cityCode}:`, e);
                        }
                        
                        return (
                          <g onClick={() => handleCityClick(cityCode)}>
                            {/* Ana şehir noktası */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r="10"
                              fill="#14b8a6" // Modern teal renk
                              fillOpacity="0.8"
                              stroke="white"
                              strokeWidth="2"
                              style={{ 
                                cursor: 'pointer', 
                                transition: 'all 0.2s ease',
                              }}
                            />
                            {/* Kurum sayısı */}
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
                    
                    {/* Kurumlar (yakınlaştırıldığında göster) */}
                    {zoomedCity === cityCode && russianCenters
                      .filter(center => center.cityCode === cityCode)
                      .map((institution) => (
                        <g 
                          key={institution.id} 
                          onClick={(e) => handleInstitutionClick(e, institution)}
                        >
                          {/* Kurum noktası */}
                          <circle
                            cx={institution.location.x}
                            cy={institution.location.y}
                            r="5"
                            fill={getMarkerColor(institution.type)}
                            fillOpacity={selectedInstitution && selectedInstitution.id === institution.id ? '1' : '0.9'}
                            stroke={selectedInstitution && selectedInstitution.id === institution.id ? '#fff' : 'white'}
                            strokeWidth={selectedInstitution && selectedInstitution.id === institution.id ? '2' : '1'}
                            style={{ 
                              cursor: 'pointer', 
                              transition: 'all 0.2s ease',
                            }}
                          />
                        </g>
                      ))
                    }
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Pinch-zoom talimatları (mobil için) */}
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
            display: 'none' // Varsayılan olarak gizli, media query ile gösterilecek
          }}>
            Yakınlaşmak için iki parmağınızla uzaklaştırın.
          </div>

          {/* Zoomed şehir bilgisi */}
          {!showSideMenu && zoomedCity && (
            <div className="info-title" style={{ 
              position: 'absolute', 
              top: '100px', 
              left: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '8px',
              borderRadius: '5px',
              boxShadow: '0 0 10px rgba(0,0,0,0.2)',
              borderLeft: '4px solid #14b8a6', // Modern teal
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
          fill: #2dd4bf !important;
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
