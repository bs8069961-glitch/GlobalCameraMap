import "./../styles/header.css";

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <h1>🌍 Global Camera Map</h1>
        <p>AI Powered Challan Camera Navigation</p>
      </div>

      <div className="header-center">
        <input
          type="text"
          placeholder="Search city, road, or camera..."
          className="search-input"
        />
      </div>

      <div className="header-right">
        <button className="header-btn">🗺 Route</button>
        <button className="header-btn">🔔</button>
        <button className="header-btn">🌙</button>
      </div>
    </header>
  );
}

export default Header;
