import { useState, useMemo, useCallback, useReducer, useRef, useEffect } from "react";
import "./App.css";
import { authAPI, productsAPI, cartAPI, ordersAPI, setToken, getToken, clearToken } from "./api";

// ─────────────────────────────────────────────────────────────
// COLOURS & ANIMATIONS
// ─────────────────────────────────────────────────────────────
const C = {
  orange: "#FF9900", orangeDk: "#E47911",
  navy: "#131921", navyMd: "#232F3E", navyLt: "#37475A",
  text: "#0F1111", muted: "#565959",
  blue: "#007185", blueLt: "#e7f5f7",
  green: "#007600", greenLt: "#f0fff4", greenBd: "#c6f6d5",
  red: "#B12704", redLt: "#fff5f5",
  warn: "#F08804",
  border: "#D5D9D9", bg: "#EAEDED",
  white: "#ffffff", surface: "#F7F8F8",
};

const S = {
  card: {
    background: C.white, borderRadius: 8,
    boxShadow: "0 2px 5px rgba(213,217,217,.5),0 0 0 1px rgba(213,217,217,.5)",
    transition: "all 0.3s ease",
  },
  btn: {
    border: "none", borderRadius: 20,
    fontWeight: 700, cursor: "pointer", transition: "all .18s ease",
  },
};

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────
const fmt = (n) => `₹${n?.toLocaleString('en-IN') || '0'}`; // Currency formatter for Indian Rupees
const num = (n) => n?.toLocaleString('en-IN') || '0'; // Number formatter
const badgeColors = {
  "Best Seller": { bg: "#FF9900", color: "#000" },
  "Hot Deal":    { bg: "#FF4444", color: "#FFF" },
  "Limited":     { bg: "#8B5CF6", color: "#FFF" },
};

// ─────────────────────────────────────────────────────────────
// ANIMATIONS CSS (Injected via style tag)
// ─────────────────────────────────────────────────────────────
const animationStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { opacity: 1; transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  .fade-in-up { animation: fadeInUp 0.6s ease-out; }
  .pulse { animation: pulse 2s infinite; }
  .slide-in-left { animation: slideInLeft 0.5s ease-out; }
  .bounce-in { animation: bounceIn 0.8s ease-out; }
  .loading-spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #FF9900;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationStyles;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
// PRODUCTS MOCK DATA (fallback for demo)
// ─────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { _id: 1,  name: "boAt Rockerz 450 Pro Bluetooth Headphone",        category: "Electronics",  price: 1299,  originalPrice: 3990,   discount: 67, rating: 4.3, reviews: 48291, stock: 3,  badge: "Best Seller", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop", bg: "#1a1a2e" },
  { _id: 2,  name: "Samsung 43\" 4K Ultra HD Smart LED TV",            category: "Electronics",  price: 31999, originalPrice: 54999,  discount: 42, rating: 4.5, reviews: 12847, stock: 7,  badge: "Hot Deal",    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=300&fit=crop", bg: "#0d1117" },
  { _id: 3,  name: "Apple iPhone 15 128GB — Midnight Blue",            category: "Smartphones",  price: 74999, originalPrice: 79900,  discount: 6,  rating: 4.6, reviews: 23451, stock: 12, badge: null,          image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=300&fit=crop", bg: "#2d3748" },
  { _id: 4,  name: "Nike Air Max 270 Running Shoes",                   category: "Footwear",     price: 5495,  originalPrice: 10995,  discount: 50, rating: 4.2, reviews: 8932,  stock: 2,  badge: "Limited",     image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop", bg: "#1a365d" },
  { _id: 5,  name: "Apple MacBook Air M2 8GB/256GB",                   category: "Laptops",      price: 99900, originalPrice: 119900, discount: 17, rating: 4.7, reviews: 6721,  stock: 5,  badge: "Best Seller", image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=300&fit=crop", bg: "#1a1a1a" },
  { _id: 6,  name: "Sony ZV-E10 Mirrorless Camera Kit",                category: "Cameras",      price: 54990, originalPrice: 69990,  discount: 21, rating: 4.4, reviews: 3241,  stock: 4,  badge: "Hot Deal",    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&h=300&fit=crop", bg: "#1a202c" },
  { _id: 7,  name: "Amazon Kindle Paperwhite 16GB (2024)",             category: "Electronics",  price: 13999, originalPrice: 16999,  discount: 18, rating: 4.5, reviews: 34521, stock: 9,  badge: null,          image: "https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=300&h=300&fit=crop", bg: "#2d3748" },
  { _id: 8,  name: "JBL Charge 5 Portable Bluetooth Speaker",         category: "Audio",        price: 11999, originalPrice: 19999,  discount: 40, rating: 4.4, reviews: 15678, stock: 6,  badge: "Best Seller", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop", bg: "#1a1a2e" },
  { _id: 9,  name: "Apple Watch Series 9 GPS 45mm",                   category: "Wearables",    price: 41900, originalPrice: 44900,  discount: 7,  rating: 4.6, reviews: 9832,  stock: 3,  badge: "Hot Deal",    image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=300&h=300&fit=crop", bg: "#0d1117" },
  { _id: 10, name: "Apple iPad 10th Gen 64GB WiFi Silver",             category: "Tablets",      price: 44900, originalPrice: 54900,  discount: 18, rating: 4.5, reviews: 7654,  stock: 8,  badge: null,          image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop", bg: "#1a202c" },
  { _id: 11, name: "Logitech G502 X Plus Wireless Gaming Mouse",       category: "Gaming",       price: 3495,  originalPrice: 7495,   discount: 53, rating: 4.3, reviews: 22341, stock: 11, badge: "Best Seller", image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop", bg: "#1a1a2e" },
  { _id: 12, name: "Philips HD7769 Coffee Maker 1.2L Thermal",        category: "Appliances",   price: 2999,  originalPrice: 5499,   discount: 45, rating: 4.1, reviews: 5432,  stock: 2,  badge: "Limited",     image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop", bg: "#2d1810" },
];

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const pid = action.p._id || action.p.id;
      const existing = state.find((i) => (i._id || i.id) === pid);
      if (existing) return state.map((i) => (i._id || i.id) === pid ? { ...i, qty: i.qty + 1 } : i);
      return [...state, { ...action.p, qty: 1 }];
    }
    case "SET_QTY":
      if (action.qty < 1) return state.filter((i) => (i._id || i.id) !== action.id);
      return state.map((i) => (i._id || i.id) === action.id ? { ...i, qty: action.qty } : i);
    case "REMOVE": return state.filter((i) => (i._id || i.id) !== action.id);
    case "CLEAR":  return [];
    default:       return state;
  }
}

// ─────────────────────────────────────────────────────────────
// SEARCH BAR WITH AUTO-SUGGESTIONS
// ─────────────────────────────────────────────────────────────
function SearchBar({ sq, setSq, onSearch, suggestions, showSuggestions, setShowSuggestions }) {
  const [inputValue, setInputValue] = useState(sq);
  const searchRef = useRef();

  useEffect(() => {
    setInputValue(sq);
  }, [sq]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setSq(value);
    // Show suggestions if there are matches
    if (value.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch(inputValue);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setSq(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} style={{ position: "relative", flex: 1, maxWidth: 600 }}>
      <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", border: `2px solid ${C.orange}` }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Search for products, brands and more"
          style={{
            flex: 1,
            padding: "10px 16px",
            border: "none",
            outline: "none",
            fontSize: 15,
            color: C.text,
            background: C.white
          }}
        />
        <button
          onClick={() => onSearch(inputValue)}
          style={{
            background: C.orange,
            border: "none",
            padding: "0 18px",
            fontSize: 18,
            cursor: "pointer",
            color: C.navy,
            fontWeight: 600
          }}
        >
          🔍
        </button>
      </div>

      {/* Auto-suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          maxHeight: 300,
          overflowY: "auto"
        }}>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom: index < suggestions.length - 1 ? `1px solid ${C.bg}` : "none",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
              onMouseEnter={(e) => e.target.style.background = C.bg}
              onMouseLeave={(e) => e.target.style.background = C.white}
            >
              <span style={{ fontSize: 14 }}>🔍</span>
              <span style={{ fontSize: 14, color: C.text }}>{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STARS
// ─────────────────────────────────────────────────────────────
function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: C.orange, fontSize: 13, letterSpacing: 1 }}>
        {"★".repeat(full)}{half ? "★" : ""}{"☆".repeat(5 - full - (half ? 1 : 0))}
      </span>
      <span style={{ color: C.blue, fontSize: 12 }}>
        {(Math.round(rating * 10) / 10).toFixed(1)} ({num(rating)})
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────
function Navbar({ page, setPage, cartQty, sq, setSq, onSearch, suggestions, showSuggestions, setShowSuggestions, user, onLogout }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav style={{
      background: C.navy,
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      position: "sticky",
      top: 0,
      zIndex: 999,
      boxShadow: "0 2px 8px rgba(0,0,0,.35)"
    }}>
      {/* Logo */}
      <div
        onClick={() => { setPage("home"); setSq(""); setShowSuggestions(false); }}
        style={{ cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
      >
        <div style={{ color: C.white, fontWeight: 900, fontSize: 24, letterSpacing: -1 }}>amazon</div>
        <div style={{ color: C.orange, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginTop: -3 }}>.in</div>
      </div>

      {/* Search Bar */}
      <SearchBar
        sq={sq}
        setSq={setSq}
        onSearch={onSearch}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
      />

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        <NavLink label="Home" onClick={() => setPage("home")} active={page === "home"} />
        <NavLink label="Products" onClick={() => setPage("products")} active={page === "products"} />
        <NavLink label="Cart" onClick={() => setPage("cart")} active={page === "cart"} badge={cartQty} />
        <NavLink label="Orders" onClick={() => setPage("orders")} active={page === "orders"} />

        {/* User Menu */}
        <div ref={userMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              background: "none",
              border: "none",
              color: C.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14
            }}
          >
            <span>{user ? `👤 ${user.name || user.email}` : "👤 Account"}</span>
            <span style={{ fontSize: 12 }}>▼</span>
          </button>

          {userMenuOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: 150,
              zIndex: 1000
            }}>
              {user ? (
                <>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.bg}`, fontSize: 14, color: C.muted }}>
                    Hello, {user.name || user.email}
                  </div>
                  <div
                    onClick={() => { setPage("orders"); setUserMenuOpen(false); }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${C.bg}`,
                      fontSize: 14,
                      color: C.text
                    }}
                    onMouseEnter={(e) => e.target.style.background = C.bg}
                    onMouseLeave={(e) => e.target.style.background = C.white}
                  >
                    Your Orders
                  </div>
                  <div
                    onClick={() => { onLogout(); setUserMenuOpen(false); }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      fontSize: 14,
                      color: C.text
                    }}
                    onMouseEnter={(e) => e.target.style.background = C.bg}
                    onMouseLeave={(e) => e.target.style.background = C.white}
                  >
                    Sign Out
                  </div>
                </>
              ) : (
                <>
                  <div
                    onClick={() => { setPage("login"); setUserMenuOpen(false); }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      borderBottom: `1px solid ${C.bg}`,
                      fontSize: 14,
                      color: C.text
                    }}
                    onMouseEnter={(e) => e.target.style.background = C.bg}
                    onMouseLeave={(e) => e.target.style.background = C.white}
                  >
                    Sign In
                  </div>
                  <div
                    onClick={() => { setPage("signup"); setUserMenuOpen(false); }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      fontSize: 14,
                      color: C.text
                    }}
                    onMouseEnter={(e) => e.target.style.background = C.bg}
                    onMouseLeave={(e) => e.target.style.background = C.white}
                  >
                    Sign Up
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ label, onClick, active, badge }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer", position: "relative", color: active ? C.orange : C.white, fontWeight: active ? 700 : 400, fontSize: 14, padding: "4px 2px", borderBottom: `2px solid ${active ? C.orange : "transparent"}`, transition: "all .15s" }}>
      {label}
      {badge > 0 && (
        <span style={{ position: "absolute", top: -8, right: -10, background: C.orange, color: C.navy, borderRadius: 99, width: 18, height: 18, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILTERS SIDEBAR
// ─────────────────────────────────────────────────────────────
function FiltersSidebar({ filters, setFilters, categories, brands }) {
  const handlePriceChange = (min, max) => {
    setFilters({ ...filters, priceMin: min, priceMax: max });
  };

  const handleRatingChange = (rating) => {
    setFilters({ ...filters, minRating: rating });
  };

  const handleCategoryChange = (category) => {
    setFilters({ ...filters, category: filters.category === category ? '' : category });
  };

  const handleBrandChange = (brand) => {
    setFilters({ ...filters, brand: filters.brand === brand ? '' : brand });
  };

  return (
    <div style={{ minWidth: 280, background: C.white, borderRadius: 8, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: C.text }}>Filters</h3>

      {/* Price Range */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: C.text }}>Price Range</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Under ₹1,000", min: 0, max: 1000 },
            { label: "₹1,000 - ₹5,000", min: 1000, max: 5000 },
            { label: "₹5,000 - ₹10,000", min: 5000, max: 10000 },
            { label: "₹10,000 - ₹25,000", min: 10000, max: 25000 },
            { label: "Over ₹25,000", min: 25000, max: 1000000 }
          ].map((range) => (
            <label key={range.label} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name="priceRange"
                checked={filters.priceMin === range.min && filters.priceMax === range.max}
                onChange={() => handlePriceChange(range.min, range.max)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, color: C.text }}>{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: C.text }}>Customer Rating</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[4, 3, 2, 1].map((rating) => (
            <label key={rating} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name="rating"
                checked={filters.minRating === rating}
                onChange={() => handleRatingChange(rating)}
                style={{ cursor: "pointer" }}
              />
              <Stars rating={rating} />
              <span style={{ fontSize: 14, color: C.muted }}>& up</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: C.text }}>Category</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.map((category) => (
            <label key={category} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name="category"
                checked={filters.category === category}
                onChange={() => handleCategoryChange(category)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, color: C.text }}>{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Brand Filter */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: C.text }}>Brand</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {brands.map((brand) => (
            <label key={brand} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filters.brand === brand}
                onChange={() => handleBrandChange(brand)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, color: C.text }}>{brand}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => setFilters({ priceMin: 0, priceMax: 1000000, minRating: 0, category: '', brand: '' })}
        style={{ ...S.btn, background: C.navyMd, color: C.white, padding: "10px 16px", width: "100%", fontSize: 14 }}
      >
        Clear All Filters
      </button>
    </div>
  );
}

function ProductCard({ p, onAdd, onBuyNow, pulseId }) {
  const [hover,   setHover]   = useState(false);
  const [btnAnim, setBtnAnim] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const isLow   = p.stock <= 3;
  const isPulse = pulseId === (p._id || p.id);

  const handleAdd = () => {
    onAdd(p);
    setBtnAnim(true);
    setTimeout(() => setBtnAnim(false), 700);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="fade-in-up"
      style={{
        ...S.card, display: "flex", flexDirection: "column", overflow: "hidden",
        transform:  hover ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow:  hover ? "0 12px 32px rgba(0,0,0,.15),0 0 0 1px rgba(213,217,217,.5)" : S.card.boxShadow,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Image area */}
      <div style={{ background: p.bg, height: 220, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0, overflow: "hidden" }}>
        {!imageLoaded && (
          <div className="loading-spinner" style={{ position: "absolute", zIndex: 1 }}></div>
        )}
        <img
          src={p.image}
          alt={p.name || p.title}
          onLoad={() => setImageLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />

        {p.badge && (
          <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: badgeColors[p.badge]?.bg, color: badgeColors[p.badge]?.color, boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
            {p.badge === "Best Seller" ? "🏆 Best Seller" : p.badge === "Hot Deal" ? "🔥 Hot Deal" : "⚡ Limited"}
          </div>
        )}

        <div style={{ position: "absolute", top: 10, right: 10, background: C.red, color: C.white, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
          -{p.discount || p.disc}%
        </div>

        {/* Quick actions on hover */}
        {hover && (
          <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "flex", gap: 8, opacity: 0, animation: "fadeInUp 0.3s ease forwards" }}>
            <button onClick={handleAdd} style={{ ...S.btn, flex: 1, background: isPulse ? C.green : C.orange, color: C.navy, padding: "6px 0", fontSize: 12, transform: btnAnim ? "scale(0.95)" : "scale(1)" }}>
              {isPulse ? "✓ Added" : "🛒 Add"}
            </button>
            <button onClick={() => onBuyNow(p)} style={{ ...S.btn, flex: 1, background: C.navyMd, color: C.white, padding: "6px 0", fontSize: 12 }}>
              ⚡ Buy Now
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
        <h3 style={{ fontSize: 14, color: C.text, lineHeight: 1.4, fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>
          {p.name || p.title}
        </h3>

        <Stars rating={p.rating} />

        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{fmt(p.price)}</span>
            <span style={{ fontSize: 12, color: C.muted, textDecoration: "line-through" }}>{fmt(p.originalPrice || p.orig)}</span>
          </div>
          <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
            You save: {fmt((p.originalPrice || p.orig) - p.price)} ({p.discount || p.disc}%)
          </div>
        </div>

        {isLow
          ? <div style={{ fontSize: 12, color: C.red,  fontWeight: 600 }}>⚡ Only {p.stock} left in stock — order soon!</div>
          : p.stock <= 10 && <div style={{ fontSize: 12, color: C.warn, fontWeight: 600 }}>📦 Only {p.stock} left</div>
        }

        <div style={{ fontSize: 12, color: C.green }}>✅ FREE delivery tomorrow</div>

        {/* Add to Cart button (visible when not hovering) */}
        {!hover && (
          <button onClick={handleAdd} style={{ ...S.btn, width: "100%", background: isPulse ? C.green : C.orange, color: C.navy, padding: "10px 0", fontSize: 13, marginTop: "auto", transform: btnAnim ? "scale(0.97)" : "scale(1)" }}>
            {isPulse ? "✓ Added to Cart" : "🛒 Add to Cart"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME PAGE (PRODUCT LISTING WITH FILTERS)
// ─────────────────────────────────────────────────────────────
function HomePage({ products, onAdd, onBuyNow, pulseId, sq, setSq, onViewProduct }) {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [filters, setFilters] = useState({
    priceMin: 0,
    priceMax: 1000000,
    minRating: 0,
    category: '',
    brand: ''
  });

  // Extract unique categories and brands from products
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
  const brands = [...new Set(products.map(p => p.brand))].filter(Boolean);

  const trustItems = [
    { icon: "🚚", t: "Free Delivery",   s: "Orders above ₹499" },
    { icon: "↩️", t: "10-Day Returns",  s: "Easy hassle-free"  },
    { icon: "🔒", t: "Secure Pay",      s: "SSL encrypted"     },
    { icon: "✅", t: "100% Genuine",    s: "Authorised sellers" },
  ];

  const banners = [
    {
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop",
      title: "🔥 MEGA SALE — UP TO 70% OFF",
      subtitle: "Top Deals of the Day",
      description: "Free delivery on orders above ₹499 · Easy returns · Secure payments"
    },
    {
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop",
      title: "🎁 Holiday Special Offers",
      subtitle: "Exclusive Deals Just for You",
      description: "Limited time offers on electronics, fashion & home essentials"
    },
    {
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      title: "📱 Tech Week Extravaganza",
      subtitle: "Latest Gadgets at Unbeatable Prices",
      description: "Smartphones, laptops & accessories with massive discounts"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Apply filters and sorting
  const filteredAndSortedProducts = products.filter(product => {
    const matchesPrice = product.price >= filters.priceMin && product.price <= filters.priceMax;
    const matchesRating = product.rating >= filters.minRating;
    const matchesCategory = !filters.category || product.category === filters.category;
    const matchesBrand = !filters.brand || product.brand === filters.brand;

    return matchesPrice && matchesRating && matchesCategory && matchesBrand;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      default:
        return 0;
    }
  });

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 16px" }}>
      {/* Hero Banner Carousel */}
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ height: 300, position: "relative" }}>
          {banners.map((banner, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: index === currentBanner ? 1 : 0,
                transition: "opacity 0.5s ease",
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${banner.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "white"
              }}
            >
              <div className="slide-in-left">
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, marginBottom: 8, color: C.orange }}>{banner.title}</div>
                <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, margin: 0 }}>{banner.subtitle}</h1>
                <p style={{ fontSize: 16, margin: 0, opacity: 0.9 }}>{banner.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Banner Navigation */}
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBanner(index)}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "none",
                background: index === currentBanner ? C.orange : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            />
          ))}
        </div>
      </div>

      {/* Trust bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {trustItems.map((x) => (
          <div key={x.t} className="bounce-in" style={{ ...S.card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 140, animationDelay: `${trustItems.indexOf(x) * 0.1}s` }}>
            <span style={{ fontSize: 24 }}>{x.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{x.t}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{x.s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>Shop by Category</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {[
            { name: "Electronics", icon: "📱", color: "#FF6B6B" },
            { name: "Fashion", icon: "👕", color: "#4ECDC4" },
            { name: "Home", icon: "🏠", color: "#45B7D1" },
            { name: "Sports", icon: "⚽", color: "#96CEB4" },
            { name: "Books", icon: "📚", color: "#FFEAA7" },
            { name: "Beauty", icon: "💄", color: "#DDA0DD" }
          ].map((cat) => (
            <div key={cat.name} className="fade-in-up" style={{ ...S.card, padding: "16px", textAlign: "center", cursor: "pointer", transition: "transform 0.2s ease" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{cat.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cat.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Sort Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 300 }}>
          <input
            type="text"
            placeholder="Search products..."
            value={sq}
            onChange={(e) => setSq(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 16,
              outline: "none",
              "&:focus": { borderColor: C.orange }
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "12px 16px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 16,
              background: C.white,
              cursor: "pointer"
            }}
          >
            <option value="relevance">Sort by: Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
        <div style={{ fontSize: 14, color: C.muted }}>
          {filteredAndSortedProducts.length} products found
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32 }}>
        {/* Filters Sidebar */}
        <FiltersSidebar
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          brands={brands}
        />

        {/* Products Grid */}
        <div>
          {filteredAndSortedProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <h2>No products found</h2>
              <p style={{ color: C.muted, marginTop: 8 }}>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 24
            }}>
              {filteredAndSortedProducts.map((p, index) => (
                <div key={p._id || p.id} style={{ animationDelay: `${index * 0.1}s` }}>
                  <ProductCard p={p} onAdd={onAdd} onBuyNow={onBuyNow} pulseId={pulseId} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onSwitchToSignup }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authAPI.login(form.email, form.password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ ...S.card, padding: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8, color: C.text }}>Sign In</h1>
        <p style={{ textAlign: "center", color: C.muted, marginBottom: 32 }}>Welcome back to Amazon Clone</p>

        {error && (
          <div style={{ background: C.redLt, color: C.red, padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                "&:focus": { borderColor: C.orange }
              }}
              placeholder="Enter your email"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                "&:focus": { borderColor: C.orange }
              }}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...S.btn,
              background: C.orange,
              color: C.navy,
              padding: "14px 24px",
              fontSize: 16,
              width: "100%",
              marginBottom: 20,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: "center" }}>
          <span style={{ color: C.muted, fontSize: 14 }}>New to Amazon Clone? </span>
          <button
            onClick={onSwitchToSignup}
            style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, textDecoration: "underline" }}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIGNUP PAGE
// ─────────────────────────────────────────────────────────────
function SignupPage({ onSignup, onSwitchToLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await authAPI.register(form.name, form.email, form.password);
      onSignup(user);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ ...S.card, padding: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8, color: C.text }}>Create Account</h1>
        <p style={{ textAlign: "center", color: C.muted, marginBottom: 32 }}>Join Amazon Clone today</p>

        {error && (
          <div style={{ background: C.redLt, color: C.red, padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                "&:focus": { borderColor: C.orange }
              }}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                "&:focus": { borderColor: C.orange }
              }}
              placeholder="Enter your email"
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                "&:focus": { borderColor: C.orange }
              }}
              placeholder="Create a password"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 16,
                outline: "none",
                "&:focus": { borderColor: C.orange }
              }}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...S.btn,
              background: C.orange,
              color: C.navy,
              padding: "14px 24px",
              fontSize: 16,
              width: "100%",
              marginBottom: 20,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: "center" }}>
          <span style={{ color: C.muted, fontSize: 14 }}>Already have an account? </span>
          <button
            onClick={onSwitchToLogin}
            style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, textDecoration: "underline" }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CART ITEM
// ─────────────────────────────────────────────────────────────
function CartItem({ item, onSetQty, onRemove }) {
  const savings = ((item.originalPrice || item.orig) - item.price) * item.qty;
  const pid = item._id || item.id;
  return (
    <div style={{ display: "flex", gap: 14, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 96, height: 96, borderRadius: 8, overflow: "hidden", flexShrink: 0, position: "relative" }}>
        <img
          src={item.image}
          alt={item.name || item.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 15, color: C.text, fontWeight: 500, lineHeight: 1.4 }}>{item.name || item.title}</div>
        <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>In Stock</div>
        <div style={{ fontSize: 12, color: C.green }}>✅ FREE Delivery Tomorrow</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          {/* Quantity stepper */}
          <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden", background: C.surface }}>
            <button onClick={() => onSetQty(pid, item.qty - 1)} style={{ ...S.btn, background: C.surface, borderRadius: 0, padding: "4px 10px", fontSize: 18, color: C.text }}>−</button>
            <span style={{ padding: "4px 14px", fontWeight: 700, fontSize: 15, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>{item.qty}</span>
            <button onClick={() => onSetQty(pid, item.qty + 1)} style={{ ...S.btn, background: C.surface, borderRadius: 0, padding: "4px 10px", fontSize: 18, color: C.text }}>+</button>
          </div>
          <button onClick={() => onRemove(pid)} style={{ background: "none", border: "none", color: C.blue, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Delete</button>
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{fmt(item.price * item.qty)}</div>
        <div style={{ fontSize: 12, color: C.muted, textDecoration: "line-through" }}>{fmt((item.originalPrice || item.orig) * item.qty)}</div>
        <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Save {fmt(savings)}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUMMARY ROW (reused in Cart + Checkout)
// ─────────────────────────────────────────────────────────────
function SummaryRow({ label, val, valC, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: bold ? 700 : 400, fontSize: bold ? 15 : 14 }}>
      <span style={{ color: C.text }}>{label}</span>
      <span style={{ color: valC || C.text }}>{val}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CART PAGE
// ─────────────────────────────────────────────────────────────
function CartPage({ cart, onSetQty, onRemove, setPage }) {
  const total     = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const origTotal = useMemo(() => cart.reduce((s, i) => s + (i.originalPrice || i.orig)  * i.qty, 0), [cart]);
  const savings   = origTotal - total;
  const totalQty  = cart.reduce((s, i) => s + i.qty, 0);

  if (!cart.length) {
    return (
      <div style={{ maxWidth: 700, margin: "60px auto", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🛒</div>
        <h2 style={{ color: C.navyMd, marginBottom: 8 }}>Your Cart is empty</h2>
        <p style={{ color: C.muted, marginBottom: 24 }}>Nothing in your cart yet. Let's change that!</p>
        <button onClick={() => setPage("home")} style={{ ...S.btn, background: C.orange, color: C.navy, padding: "10px 28px", fontSize: 15 }}>
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
      {/* Cart list */}
      <div>
        <div style={S.card}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Shopping Cart</h2>
            <span style={{ color: C.muted }}>{totalQty} item{totalQty !== 1 ? "s" : ""}</span>
          </div>
          {savings > 0 && (
            <div style={{ background: C.greenLt, padding: "10px 20px", borderBottom: `1px solid ${C.greenBd}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎉</span>
              <span style={{ color: C.green, fontWeight: 600, fontSize: 14 }}>Your cart has {fmt(savings)} in savings!</span>
            </div>
          )}
          {cart.map((item) => (
            <CartItem key={item._id || item.id} item={item} onSetQty={onSetQty} onRemove={onRemove} />
          ))}
        </div>

        {/* Upsell */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 17, marginBottom: 14, color: C.text }}>Customers also bought</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {MOCK_PRODUCTS.slice(0, 4).map((p) => (
              <div key={p._id} style={{ ...S.card, padding: 12, textAlign: "center", cursor: "pointer", transition: "transform 0.2s ease" }}>
                <div style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", margin: "0 auto 8px" }}>
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ fontSize: 11, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{(p.name || p.title).slice(0, 40)}…</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>{fmt(p.price)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky summary */}
      <div style={{ position: "sticky", top: 72 }}>
        <div style={{ ...S.card, padding: 18 }}>
          {savings > 0 && (
            <div style={{ background: C.greenLt, padding: "10px 12px", borderRadius: 6, marginBottom: 12, color: C.green, fontWeight: 600, fontSize: 13, border: `1px solid ${C.greenBd}`, textAlign: "center" }}>
              🎉 You are saving {fmt(savings)} on this order
            </div>
          )}
          <h3 style={{ fontSize: 16, marginBottom: 14, color: C.text }}>Order Summary</h3>
          <SummaryRow label={`Subtotal (${totalQty} items)`} val={fmt(origTotal)} />
          <SummaryRow label="Discount"  val={`-${fmt(savings)}`} valC={C.green} />
          <SummaryRow label="Delivery"  val="FREE"              valC={C.green} />
          <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "10px 0" }} />
          <SummaryRow label="Order Total" val={fmt(total)} bold />
          <button onClick={() => setPage("checkout")} style={{ ...S.btn, width: "100%", background: C.orange, color: C.navy, padding: "12px", fontSize: 16, marginTop: 14 }}>
            Proceed to Checkout →
          </button>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: C.muted }}>🔒 Secure checkout · SSL encrypted</div>
        </div>
        <div style={{ background: C.greenLt, borderRadius: 8, padding: "12px 14px", marginTop: 10, border: `1px solid ${C.greenBd}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>🚚 Get it by Tomorrow</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Order within next 3 hrs 42 mins</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAYMENT FORM
// ─────────────────────────────────────────────────────────────
function PaymentForm({ method, setMethod, fd, setFd }) {
  const upd     = (k, v) => setFd((d) => ({ ...d, [k]: v }));
  const fmtCard = (v)    => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp  = (v)    => { const s = v.replace(/\D/g, "").slice(0, 4); return s.length > 2 ? s.slice(0, 2) + "/" + s.slice(2) : s; };

  const methods = [
    { id: "upi",  icon: "⚡", label: "UPI",                    sub: "GPay, PhonePe, Paytm",       tag: "Recommended", tagC: C.green },
    { id: "card", icon: "💳", label: "Credit / Debit Card",    sub: "Visa, Mastercard, Rupay",    tag: null },
    { id: "cod",  icon: "💵", label: "Cash on Delivery",       sub: "Pay when order arrives",     tag: "Popular in India", tagC: C.blue },
  ];

  const inp = { width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: C.white };
  const lbl = { display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 5 };

  return (
    <div>
      <h3 style={{ fontSize: 17, marginBottom: 14, color: C.text }}>Select Payment Method</h3>
      {methods.map((m) => (
        <div key={m.id} onClick={() => setMethod(m.id)} style={{ border: `2px solid ${method === m.id ? C.orange : C.border}`, borderRadius: 8, padding: 14, marginBottom: 10, cursor: "pointer", background: method === m.id ? "#fffbf0" : C.white, transition: "all .15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${method === m.id ? C.orange : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {method === m.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange }} />}
            </div>
            <span style={{ fontSize: 18 }}>{m.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{m.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{m.sub}</div>
            </div>
            {m.tag && <span style={{ marginLeft: "auto", fontSize: 11, background: m.tagC + "22", color: m.tagC, padding: "2px 10px", borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>{m.tag}</span>}
          </div>

          {/* UPI fields */}
          {method === m.id && m.id === "upi" && (
            <div style={{ marginTop: 12 }}>
              <label style={lbl}>UPI ID</label>
              <input value={fd.upi || ""} onChange={(e) => upd("upi", e.target.value)} placeholder="yourname@upi" style={inp} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>e.g. mobile@paytm, name@gpay</div>
            </div>
          )}

          {/* Card fields */}
          {method === m.id && m.id === "card" && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={lbl}>Card Number</label>
                <input value={fd.cardNum || ""} onChange={(e) => upd("cardNum", fmtCard(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19} style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Expiry</label>
                  <input value={fd.exp || ""} onChange={(e) => upd("exp", fmtExp(e.target.value))} placeholder="MM/YY" maxLength={5} style={inp} />
                </div>
                <div>
                  <label style={lbl}>CVV</label>
                  <input value={fd.cvv || ""} onChange={(e) => upd("cvv", e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="•••" type="password" maxLength={3} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Name on Card</label>
                <input value={fd.cname || ""} onChange={(e) => upd("cname", e.target.value)} placeholder="As printed on card" style={inp} />
              </div>
            </div>
          )}

          {/* COD confirmation */}
          {method === m.id && m.id === "cod" && (
            <div style={{ marginTop: 12, background: C.greenLt, padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 14, color: C.green, fontWeight: 600 }}>✅ Pay when your order arrives</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>No additional charges · Cash or card at delivery</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHECKOUT PAGE
// ─────────────────────────────────────────────────────────────
function CheckoutPage({ cart, onPlace, loading }) {
  const [method, setMethod] = useState("upi");
  const [fd,     setFd]     = useState({});
  const [err,    setErr]    = useState("");

  const total    = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const orig     = useMemo(() => cart.reduce((s, i) => s + (i.originalPrice || i.orig)  * i.qty, 0), [cart]);
  const savings  = orig - total;
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  const validate = () => {
    if (method === "upi") {
      if (!fd.upi || !fd.upi.includes("@")) { setErr("Please enter a valid UPI ID (e.g. name@upi)"); return false; }
    }
    if (method === "card") {
      if (!fd.cardNum || fd.cardNum.replace(/\s/g, "").length < 16) { setErr("Enter a valid 16-digit card number"); return false; }
      if (!fd.exp || fd.exp.length < 5)  { setErr("Enter a valid expiry date (MM/YY)"); return false; }
      if (!fd.cvv || fd.cvv.length < 3)  { setErr("Enter a valid 3-digit CVV"); return false; }
      if (!fd.cname) { setErr("Enter the name on your card"); return false; }
    }
    setErr("");
    return true;
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
      {/* Trust bar */}
      <div style={{ background: C.navyMd, borderRadius: 8, padding: "10px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
        {["🔒 100% Secure Payments", "🛡️ Buyer Protection", "✅ Trusted by 1M+ users"].map((t) => (
          <div key={t} style={{ color: C.white, fontSize: 13 }}>{t}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        {/* Left: Payment form */}
        <div style={{ ...S.card, padding: 24 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Step 3 of 3 — Payment</div>
          <h2 style={{ fontSize: 22, color: C.text, marginBottom: 20 }}>Complete Your Order</h2>
          <PaymentForm method={method} setMethod={setMethod} fd={fd} setFd={setFd} />
          {err && (
            <div style={{ background: C.redLt, border: "1px solid #fc8181", borderRadius: 6, padding: "10px 14px", color: C.red, fontSize: 13, marginTop: 8 }}>
              ⚠️ {err}
            </div>
          )}
          <button
            onClick={() => { if (validate()) onPlace(method); }}
            disabled={loading}
            style={{ ...S.btn, width: "100%", background: loading ? C.muted : C.orange, color: C.navy, padding: "14px", fontSize: 17, marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            {loading ? "Processing your order..." : `🔒 Place Order — ${fmt(total)}`}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 10 }}>
            By placing your order, you agree to our Terms &amp; Privacy Policy
          </div>
        </div>

        {/* Right: Sticky summary */}
        <div style={{ position: "sticky", top: 72 }}>
          <div style={{ ...S.card, padding: 18 }}>
            <h3 style={{ fontSize: 16, marginBottom: 14, color: C.text }}>Order Summary</h3>
            <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 14 }}>
              {cart.map((item) => (
                <div key={item._id || item.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                    <img src={item.image} alt={item.name || item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.3 }}>{(item.name || item.title).slice(0, 50)}…</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Qty: {item.qty}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{fmt(item.price * item.qty)}</div>
                </div>
              ))}
            </div>
            <SummaryRow label={`Items (${totalQty})`} val={fmt(orig)} />
            <SummaryRow label="Discount"  val={`-${fmt(savings)}`} valC={C.green} />
            <SummaryRow label="Delivery"  val="FREE"               valC={C.green} />
            <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "10px 0" }} />
            <SummaryRow label="Total" val={fmt(total)} bold />
            {savings > 0 && (
              <div style={{ background: C.greenLt, padding: "8px 10px", borderRadius: 6, marginTop: 10, color: C.green, fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                🎉 Total savings: {fmt(savings)}
              </div>
            )}
          </div>
          <div style={{ background: C.greenLt, borderRadius: 8, padding: "12px 14px", marginTop: 10, border: `1px solid ${C.greenBd}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>🚚 Estimated delivery</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>Tomorrow, by 11 PM</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUCCESS PAGE
// ─────────────────────────────────────────────────────────────
function SuccessPage({ setPage }) {
  const ordId = useMemo(() => "ORD-" + Date.now().toString(36).toUpperCase(), []);
  return (
    <div style={{ maxWidth: 580, margin: "60px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
      <h1 style={{ color: C.green, marginBottom: 8 }}>Order Placed Successfully!</h1>
      <p style={{ color: C.muted, fontSize: 16, marginBottom: 24 }}>Thank you for shopping with us</p>
      <div style={{ ...S.card, padding: 24, textAlign: "left", marginBottom: 24 }}>
        {[
          ["Order ID",           ordId,               C.blue],
          ["Estimated Delivery", "Tomorrow, by 11 PM", C.green],
          ["Payment Status",     "Confirmed ✓",        C.green],
          ["Order Status",       "🔄 Processing",      C.orange],
        ].map(([k, v, vc]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.muted, fontSize: 14 }}>{k}</span>
            <span style={{ fontWeight: 700, color: vc, fontSize: 14 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => setPage("home")} style={{ ...S.btn, background: C.orange, color: C.navy, padding: "12px 28px", fontSize: 15 }}>
          Continue Shopping
        </button>
        <button style={{ ...S.btn, background: C.navyMd, color: C.white, padding: "12px 28px", fontSize: 15 }}>
          Track Order 🚚
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ORDERS PAGE
// ─────────────────────────────────────────────────────────────
function OrdersPage({ user, setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Mock orders data
      setOrders([
        {
          id: "ORD-001",
          date: "2024-01-15",
          status: "Delivered",
          total: 2499,
          items: [
            { name: "Wireless Headphones", price: 1999, qty: 1 },
            { name: "Phone Case", price: 500, qty: 1 }
          ]
        },
        {
          id: "ORD-002",
          date: "2024-01-10",
          status: "In Transit",
          total: 1599,
          items: [
            { name: "Smart Watch", price: 1599, qty: 1 }
          ]
        }
      ]);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>Please sign in to view your orders</h2>
        <button
          onClick={() => setPage("login")}
          style={{ ...S.btn, background: C.orange, color: C.navy, padding: "12px 24px", marginTop: 20 }}
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: C.text }}>Your Orders</h1>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <h2>No orders yet</h2>
          <p style={{ color: C.muted, marginTop: 8 }}>Start shopping to see your orders here</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {orders.map((order) => (
            <div key={order.id} style={{ ...S.card, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: C.text }}>Order #{order.id}</h3>
                  <p style={{ color: C.muted, fontSize: 14 }}>Ordered on {new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{fmt(order.total)}</div>
                  <div style={{
                    fontSize: 12,
                    color: order.status === "Delivered" ? C.green : C.blue,
                    fontWeight: 600,
                    marginTop: 4
                  }}>
                    {order.status}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: C.text }}>Items</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {order.items.map((item, index) => (
                    <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 500, color: C.text }}>{item.name}</span>
                        <span style={{ color: C.muted, marginLeft: 8 }}>Qty: {item.qty}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: C.text }}>{fmt(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button style={{ ...S.btn, background: C.navyMd, color: C.white, padding: "8px 16px", fontSize: 14 }}>
                  View Details
                </button>
                <button style={{ ...S.btn, background: C.surface, color: C.text, padding: "8px 16px", fontSize: 14 }}>
                  Track Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PRODUCT DETAIL PAGE
// ─────────────────────────────────────────────────────────────
function ProductDetailPage({ productId, onAddToCart, onBack }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      // Find product from mock data or API
      const foundProduct = MOCK_PRODUCTS.find(p => (p._id || p.id) === productId);
      if (foundProduct) {
        setProduct(foundProduct);
        // Mock reviews
        setReviews([
          { id: 1, user: "John D.", rating: 5, comment: "Excellent product! Highly recommended.", date: "2024-01-15" },
          { id: 2, user: "Sarah M.", rating: 4, comment: "Good quality, fast delivery.", date: "2024-01-10" },
          { id: 3, user: "Mike R.", rating: 5, comment: "Perfect for my needs. Will buy again!", date: "2024-01-08" }
        ]);
      }
    } catch (err) {
      console.error("Error loading product:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>Product not found</h2>
        <button onClick={onBack} style={{ ...S.btn, background: C.orange, color: C.navy, padding: "10px 20px", marginTop: 20 }}>
          ← Back to Products
        </button>
      </div>
    );
  }

  const images = [product.image, product.image, product.image]; // Mock multiple images

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
      <button onClick={onBack} style={{ ...S.btn, background: C.navyMd, color: C.white, padding: "8px 16px", marginBottom: 20 }}>
        ← Back to Products
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
        {/* Product Images */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <img
              src={images[selectedImage]}
              alt={product.name}
              style={{
                width: "100%",
                height: 400,
                objectFit: "cover",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`${product.name} ${index + 1}`}
                onClick={() => setSelectedImage(index)}
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 4,
                  cursor: "pointer",
                  border: selectedImage === index ? `2px solid ${C.orange}` : `1px solid ${C.border}`,
                  opacity: selectedImage === index ? 1 : 0.7
                }}
              />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 8 }}>{product.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Stars rating={product.rating} />
            <span style={{ fontSize: 14, color: C.muted }}>{product.reviews} reviews</span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: C.text }}>{fmt(product.price)}</span>
              <span style={{ fontSize: 18, color: C.muted, textDecoration: "line-through" }}>{fmt(product.originalPrice || product.orig)}</span>
              <span style={{ fontSize: 16, color: C.green, fontWeight: 600 }}>
                Save {fmt((product.originalPrice || product.orig) - product.price)}
              </span>
            </div>
            <div style={{ fontSize: 14, color: C.green }}>
              ✅ FREE delivery tomorrow
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>About this item</h3>
            <ul style={{ paddingLeft: 20, color: C.text, lineHeight: 1.6 }}>
              <li>Premium quality {product.category} product</li>
              <li>Advanced features and modern design</li>
              <li>Compatible with all standard accessories</li>
              <li>1 year manufacturer warranty</li>
              <li>Easy returns and exchanges</li>
            </ul>
          </div>

          {/* Quantity and Add to Cart */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <label style={{ fontSize: 16, fontWeight: 600 }}>Quantity:</label>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.border}`, borderRadius: 4 }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ ...S.btn, background: C.surface, borderRadius: 0, padding: "8px 12px", fontSize: 16 }}
                >
                  −
                </button>
                <span style={{ padding: "8px 16px", fontWeight: 600, minWidth: 40, textAlign: "center" }}>{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  style={{ ...S.btn, background: C.surface, borderRadius: 0, padding: "8px 12px", fontSize: 16 }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => onAddToCart({ ...product, qty: quantity })}
                style={{ ...S.btn, background: C.orange, color: C.navy, padding: "14px 24px", fontSize: 16, flex: 1 }}
              >
                🛒 Add to Cart
              </button>
              <button
                onClick={() => onAddToCart({ ...product, qty: quantity })}
                style={{ ...S.btn, background: C.navyMd, color: C.white, padding: "14px 24px", fontSize: 16, flex: 1 }}
              >
                ⚡ Buy Now
              </button>
            </div>
          </div>

          {/* Stock Status */}
          <div style={{ padding: 16, background: product.stock > 3 ? C.greenLt : C.warn + "20", borderRadius: 8, marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: product.stock > 3 ? C.green : C.warn }}>
              {product.stock > 3 ? "✅ In Stock" : `⚡ Only ${product.stock} left in stock`}
            </div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
              Ships from and sold by Amazon.in
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Customer Reviews</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {reviews.map((review) => (
            <div key={review.id} style={{ ...S.card, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <Stars rating={review.rating} />
                <span style={{ fontSize: 14, color: C.muted }}>{review.date}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{review.user}</div>
              <p style={{ color: C.text, lineHeight: 1.6 }}>{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [page,    setPage]   = useState("home");
  const [cart,    dispatch]  = useReducer(cartReducer, []);
  const [sq,      setSq]     = useState("");
  const [pulseId, setPulseId]= useState(null);
  const [loading, setLoading]= useState(false);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [appLoading, setAppLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load products from backend on mount
  useEffect(() => {
    const loadData = async () => {
      await loadProducts();
      await loadUser();
      setAppLoading(false);
    };
    loadData();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.list();
      setProducts(data?.length > 0 ? data : MOCK_PRODUCTS);
    } catch (err) {
      console.warn("Backend unavailable, using mock data", err);
      setProducts(MOCK_PRODUCTS);
    }
  };

  const loadUser = async () => {
    const token = getToken();
    if (token) {
      try {
        const userData = await authAPI.me();
        setUser(userData);
      } catch (err) {
        clearToken();
        setPage("home");
      }
    }
  };

  const filteredProducts = useMemo(() => {
    if (!sq.trim()) return products;
    const q = sq.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
  }, [sq, products]);

  const cartQty = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const onAdd = useCallback((p) => {
    dispatch({ type: "ADD", p });
    setPulseId(p._id || p.id);
    setTimeout(() => setPulseId(null), 1400);
  }, []);

  const onBuyNow = useCallback((p) => {
    dispatch({ type: "ADD", p });
    setPage("checkout");
  }, []);

  const onSetQty = useCallback((id, qty) => dispatch({ type: "SET_QTY", id, qty }), []);
  const onRemove = useCallback((id)       => dispatch({ type: "REMOVE", id }), []);

  const onPlace = useCallback((method) => {
    setLoading(true);
    setTimeout(() => {
      dispatch({ type: "CLEAR" });
      setLoading(false);
      setPage("success");
    }, 2200);
  }, []);

  const onLogin = useCallback((userData) => {
    setUser(userData);
    setToken(userData.token);
    setPage("home");
  }, []);

  const onSignup = useCallback((userData) => {
    setUser(userData);
    setToken(userData.token);
    setPage("home");
  }, []);

  const onLogout = useCallback(() => {
    clearToken();
    setUser(null);
    setPage("home");
  }, []);

  const onViewProduct = useCallback((product) => {
    setSelectedProduct(product);
    setPage("product");
  }, []);

  const onBackToProducts = useCallback(() => {
    setSelectedProduct(null);
    setPage("home");
  }, []);

  const onSearch = useCallback((query) => {
    setSq(query);
    setShowSuggestions(false);
  }, []);

  // Update suggestions when search query changes
  useEffect(() => {
    if (sq.trim()) {
      const mockSuggestions = products
        .filter(p => p.name.toLowerCase().includes(sq.toLowerCase()) ||
                    (p.category && p.category.toLowerCase().includes(sq.toLowerCase())))
        .slice(0, 5)
        .map(p => p.name);
      setSuggestions(mockSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [sq, products]);

  if (appLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: C.bg }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 20px" }}></div>
          <div style={{ fontSize: 18, color: C.text, fontWeight: 600 }}>Loading Amazon Clone...</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>Setting up your shopping experience</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {error && (
        <div style={{ background: C.redLt, color: C.red, padding: "10px 20px", textAlign: "center", fontSize: 14 }}>
          ⚠️ {error} <button onClick={() => setError("")} style={{ marginLeft: 10, background: "none", border: "none", color: C.red, cursor: "pointer", textDecoration: "underline" }}>Dismiss</button>
        </div>
      )}
      <Navbar page={page} setPage={setPage} cartQty={cartQty} setSq={setSq} onSearch={onSearch} suggestions={suggestions} showSuggestions={showSuggestions} setShowSuggestions={setShowSuggestions} user={user} onLogout={onLogout} />
      <main>
        {page === "home"     && <HomePage     products={filteredProducts} onAdd={onAdd} onBuyNow={onBuyNow} pulseId={pulseId} sq={sq} setSq={setSq} onViewProduct={onViewProduct} />}
        {page === "cart"     && <CartPage     cart={cart} onSetQty={onSetQty} onRemove={onRemove} setPage={setPage} />}
        {page === "checkout" && cart.length > 0 && <CheckoutPage cart={cart} onPlace={onPlace} loading={loading} />}
        {page === "success"  && <SuccessPage  setPage={setPage} />}
        {page === "login"    && <LoginPage    onLogin={onLogin} onSwitchToSignup={() => setPage("signup")} />}
        {page === "signup"   && <SignupPage   onSignup={onSignup} onSwitchToLogin={() => setPage("login")} />}
        {page === "orders"   && <OrdersPage   user={user} setPage={setPage} />}
        {page === "product"  && selectedProduct && <ProductDetailPage productId={selectedProduct._id || selectedProduct.id} onAddToCart={onAdd} onBack={onBackToProducts} />}
      </main>
    </div>
  );
}