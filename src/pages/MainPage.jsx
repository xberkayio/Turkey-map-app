import React from 'react';
import TurkeyMap from '../components/TurkeyMap';

const MainPage = () => {
  return (
    <div className="container">
      <header className="py-5 text-center">
        <h1 className="display-4">Türkiye'deki Rus Kurumları</h1>
        <p className="lead">Türkiye genelindeki Rus kurumlarının interaktif harita görünümü</p>
        <hr className="my-4" />
      </header>

      <div className="row">
        <div className="col-12">
          {/* Harita bileşenini buraya entegre ediyoruz */}
          <TurkeyMap />
        </div>
      </div>

      <div className="row mt-5">
        <div className="col-md-6">
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h3 className="card-title text-primary">Harita Hakkında</h3>
              <p className="card-text">
                Bu interaktif harita, Türkiye'deki Rus kurumlarının coğrafi konumlarını 
                göstermektedir. Şehirlere tıklayarak detaylı görünüme ulaşabilir ve kurum 
                noktalarına tıklayarak ayrıntılı bilgileri görebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-5 py-3 text-center text-muted border-top">
        <p>© 2025 Türkiye Rus Kurumları Haritası</p>
      </footer>
    </div>
  );
};

export default MainPage;