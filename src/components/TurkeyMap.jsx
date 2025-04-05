import React, { useState, useRef, useEffect } from 'react';
// Import the path data directly
import pathData from './path.json';

const TurkeyMap = () => {
  // İl bazında Rus kurumları (gerçek coğrafi koordinatlarla)
  const sehirRusya = {
    "TR06": [
      { name: 'Rus Evi Ankara Русский дом в Анкаре', geoCoords: { lat: 39.8677048, lng: 32.8155985 }, description: 'Rossotrudniçestvo Türkiye Temsilciliği', type: 'Büyükelçilik', address: 'Rabindranath Tagore Cd. No:68, 06550 Çankaya/Ankara', website: 'turkiye.rs.gov.ru' },
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

  // Paths state - now using imported path data
  const [provincePaths, setProvincePaths] = useState([]);
  
  // Kurumları koordinatlarla ilgili illere eşleme
  const [locationMappings, setLocationMappings] = useState({});
  const [russianCenters, setRussianCenters] = useState([]);

  // İllerdeki Rus kurumu sayıları
  const rusKurumSayilari = {};
  Object.keys(sehirRusya).forEach(sehirKodu => {
    rusKurumSayilari[sehirKodu] = sehirRusya[sehirKodu].length;
  });

  const [hoverCity, setHoverCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [zoomedCity, setZoomedCity] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [mapViewBox, setMapViewBox] = useState("0 0 800 350");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const mapRef = useRef(null);
  const svgRef = useRef(null);

  // Load path data
  useEffect(() => {
    // Set province paths from imported data
    setProvincePaths(pathData);
    console.log("Loaded path data:", pathData);
  }, []);

  // Kurum türüne göre renk belirleme
  const getMarkerColor = (type) => {
    switch(type) {
      case 'Büyükelçilik': return '#ff6f61';
      case 'Konsolosluk': return '#ff9e80';
      case 'Ticaret': return '#ffcc29';
      case 'Enerji': return '#6b5b95';
      case 'Kültür': return '#88d8b0';
      default: return '#525252';
    }
  };

  const pathStyles = (cityID) => ({
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    transform: hoverCity === cityID ? 'scale(1.008)' : 'scale(1)', 
    fill: selectedCity === cityID ? '#4ecdc4' 
           : hoverCity === cityID ? '#ff6b6b' 
           : '#6c757d',
    opacity: zoomedCity && zoomedCity !== cityID ? 0.3 : 1,
  });
  
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
      setZoomedCity(null);
      setMapViewBox("0 0 800 350");
      setSelectedInstitution(null);
      setShowSideMenu(false);
    } else {
      setSelectedCity(cityID);
      setZoomedCity(cityID);
      setShowSideMenu(false);
      
      // Şehrin SVG path elementini bul
      const cityPath = document.getElementById(cityID);
      if (cityPath) {
        const bbox = cityPath.getBBox();
        
        // Şehrin etrafına biraz boşluk bırakarak yakınlaştır
        const padding = 50;
        const viewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding*2} ${bbox.height + padding*2}`;
        setMapViewBox(viewBox);
      }
    }
  };

  // Rus kurumuna tıklama işlemi
  const handleInstitutionClick = (e, institution) => {
    e.stopPropagation(); // Tıklamanın il tıklamasını tetiklememesi için
    
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
  };
  
  // Kurum pozisyonlarını hesapla
  useEffect(() => {
    // Şehir elementleri hazır olduğunda konum hesaplaması yap
    const timer = setTimeout(() => {
      calculateSVGCoordinates();
    }, 1000); // Daha uzun bekle - SVG elementlerinin oluşması için
    
    return () => clearTimeout(timer);
  }, [provincePaths]); // provincePaths değiştiğinde tekrar hesapla

  useEffect(() => {
    // Başka bir şehre tıklandığında yan menüyü kapat
    setSelectedInstitution(null);
    setShowSideMenu(false);
  }, [zoomedCity]);

  // Debug için boş data kontrolü
  const isDataEmpty = provincePaths.length === 0 || 
                      provincePaths[0].d === "" || 
                      !provincePaths[0].d;

  return (
    <div className='container mt-5'>
      <h2 className="text-center mb-4">Türkiye'deki Rus Kurumları Haritası</h2>
      
      {zoomedCity && (
        <button 
          className="btn btn-sm btn-outline-secondary mb-3"
          onClick={resetMap}
        >
          Türkiye Haritasına Dön
        </button>
      )}

      {/* Debug bilgisi */}
      {isDataEmpty && (
        <div className="alert alert-warning">
          <strong>Uyarı:</strong> path.json dosyası ya yüklenemedi ya da boş veri içeriyor. 
          Lütfen dosyanın doğru formatta olduğunu kontrol edin.
        </div>
      )}
      
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
            transition: 'all 0.3s ease'
          }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 style={{ color: '#ff6f61', marginBottom: '0' }}>Kurum Bilgileri</h4>
              <button 
                className="btn btn-sm btn-outline-secondary" 
                onClick={handleCloseSideMenu}
                style={{ fontSize: '12px', padding: '2px 8px' }}
              >
                <span>&times;</span>
              </button>
            </div>
            
            <div className="text-center mb-4">
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
              <h5 style={{ color: '#333' }}>{selectedInstitution.name}</h5>
              <div style={{ 
                backgroundColor: getMarkerColor(selectedInstitution.type),
                color: 'white',
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
              <h6 style={{ color: '#6b5b95', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>Kurum Bilgileri</h6>
              <p className="mb-1">
                <strong>Şehir:</strong> {document.getElementById(zoomedCity)?.getAttribute('title') || ''}
              </p>
              <p className="mb-3">
                <strong>Adres:</strong> {selectedInstitution.address}
              </p>

              {selectedInstitution.description && (
                <div className="mb-3">
                  <h6 style={{ color: '#6b5b95', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>Açıklama</h6>
                  <p style={{ fontSize: '14px' }}>{selectedInstitution.description}</p>
                </div>
              )}
              
              {selectedInstitution.geoCoords && (
                <div className="mb-3">
                  <h6 style={{ color: '#6b5b95', borderBottom: '1px solid #f0f0f0', paddingBottom: '5px' }}>Coğrafi Koordinatlar</h6>
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
                    className="btn btn-sm btn-primary mt-2" 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      backgroundColor: '#6b5b95', 
                      borderColor: '#6b5b95',
                      padding: '8px 15px' 
                    }}
                  >
                    Websitesini Ziyaret Et
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Harita Bölümü */}
        <div 
          className='map-container' 
          onClick={handleMapClick}
          style={{ 
            width: showSideMenu ? '70%' : '100%', 
            transition: 'all 0.3s ease'
          }}
        >
          <svg 
            ref={svgRef}
            id="svg-turkey-map" 
            xmlns="http://www.w3.org/2000/svg" 
            version="1.1" 
            viewBox={mapViewBox}
            width="100%" 
            height="600px"
          >
            <g>
              {/* JSON'dan yüklenen il haritaları */}
              {provincePaths.map((province, index) => (
                <path 
                  key={province.plaka || `province-${index}`}
                  data-city-name={province.ilismi?.toLowerCase() || ""} 
                  title={province.ilismi || ""} 
                  className="city" 
                  d={province.d || ""}
                  id={province.plaka || `province-${index}`}
                  style={pathStyles(province.plaka)}
                  onMouseEnter={() => setHoverCity(province.plaka)}
                  onMouseLeave={() => setHoverCity(null)}
                  onClick={() => handleCityClick(province.plaka)}
                />
              ))}

              {/* Genel harita görünümünde il noktaları */}
              {!zoomedCity && Object.keys(rusKurumSayilari).map((sehirKodu) => {
                const cityElement = document.getElementById(sehirKodu);
                if (!cityElement) return null;
                
                let cx = 300, cy = 150;
                
                try {
                  const bbox = cityElement.getBBox();
                  cx = bbox.x + bbox.width / 2;
                  cy = bbox.y + bbox.height / 2;
                } catch (e) {
                  console.error(`Error getting bbox for ${sehirKodu}:`, e);
                }
                
                return (
                  <g key={sehirKodu} onClick={() => handleCityClick(sehirKodu)}>
                    {/* Ana şehir noktası */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="10"
                      fill="#ff6f61"
                      fillOpacity="0.8"
                      stroke="white"
                      strokeWidth="2"
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.setAttribute('r', '12');
                        e.currentTarget.setAttribute('fillOpacity', '0.9');
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.setAttribute('r', '10');
                        e.currentTarget.setAttribute('fillOpacity', '0.8');
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
                      {rusKurumSayilari[sehirKodu]}
                    </text>
                  </g>
                );
              })}

              {/* Yakınlaştırılmış görünümde kurum noktaları */}
              {zoomedCity && russianCenters
                .filter(center => center.cityCode === zoomedCity)
                .map(institution => (
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
                      onMouseOver={(e) => {
                        e.currentTarget.setAttribute('r', '7');
                        e.currentTarget.setAttribute('fillOpacity', '1');
                      }}
                      onMouseOut={(e) => {
                        if (!(selectedInstitution && selectedInstitution.id === institution.id)) {
                          e.currentTarget.setAttribute('r', '5');
                          e.currentTarget.setAttribute('fillOpacity', '0.9');
                        }
                      }}
                    />
                  </g>
                ))
              }
            </g>
          </svg>
        </div>
      </div>
      
      {/* Lejant */}
      <div className="info-legend" style={{ 
        position: 'absolute', 
        bottom: '20px', 
        right: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        borderLeft: '4px solid #ff6f61',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontSize: '12px',
        lineHeight: '16px',
        color: '#555',
        display: zoomedCity ? 'block' : 'none'
      }}>
        <div style={{ margin: '0 0 5px', color: '#ff6f61', fontSize: '14px', fontWeight: 'bold' }}>Rus Merkezleri</div>
        {['Büyükelçilik', 'Konsolosluk', 'Ticaret', 'Enerji', 'Kültür'].map(type => (
          <div key={type} style={{ marginBottom: '4px' }}>
            <span style={{ 
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: getMarkerColor(type),
              borderRadius: '50%',
              marginRight: '5px',
              border: '1px solid white'
            }}></span> {type}
          </div>
        ))}
      </div>
      
      {/* Bilgi kutusu - yan menü açıkken gizle */}
      {!showSideMenu && (
        <div className="info-title" style={{ 
          position: 'absolute', 
          top: '100px', 
          left: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px',
          borderRadius: '5px',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          borderLeft: '4px solid #ff6f61',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: '12px',
          color: '#555',
          display: zoomedCity ? 'block' : 'none'
        }}>
          <div style={{ margin: '0 0 3px', color: '#ff6f61', fontSize: '14px', fontWeight: 'bold' }}>Rusya Merkezleri</div>
          <p style={{ fontSize: '11px', margin: '2px 0' }}>Bilgi için noktalara tıklayınız</p>
        </div>
      )}
      
      {/* Seçilen şehre ait bilgi paneli */}
      {selectedCity && !zoomedCity && (
        <div className='mt-3 p-3 bg-white rounded shadow'>
          <h4 style={{ color: '#6b5b95' }}>{document.getElementById(selectedCity)?.getAttribute('title') || 'Seçilen Şehir'}</h4>
          <p>Bu şehirde {rusKurumSayilari[selectedCity] || 0} adet Rus kurumu bulunmaktadır.</p>
          <button 
            className="btn btn-sm btn-danger mt-2" 
            style={{ backgroundColor: '#ff6f61', borderColor: '#ff6f61' }}
            onClick={() => handleCityClick(selectedCity)}
          >
            Kurumları Görüntüle
          </button>
        </div>
      )}
      
      {/* CSS Stiller */}
      <style jsx>{`
        .map-container {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 30px;
          position: relative;
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
      `}</style>
    </div>
  );
};

export default TurkeyMap;
