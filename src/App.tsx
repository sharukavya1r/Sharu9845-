import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from './data/categories';
import {
  FRESH_VEGETABLES,
  FRUITS,
  MILK_AND_DAIRY,
  RICE_AND_GRAINS,
  SNACKS,
  BEVERAGES,
  HOUSEHOLD_ESSENTIALS,
  ALL_PRODUCTS,
} from './data/products';
import {
  Product,
  CartItem,
  DeliveryLocation,
  Order,
  UserProfile,
} from './types';
import { getUserOrders, saveUserOrders, createNewOrder } from './services/orderService';
import { getActiveSession, clearActiveSession, updateRealUserProfile } from './services/authService';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { HomeHero } from './components/HomeHero';
import { CategoryRow } from './components/CategoryRow';
import { ProductCarouselSection } from './components/ProductCarouselSection';
import { BottomNav, NavTab } from './components/BottomNav';
import { CartDrawer } from './components/CartDrawer';
import { OrdersPage } from './components/OrdersPage';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { LocationModal } from './components/LocationModal';
import { LoginModal } from './components/LoginModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CategoriesModal } from './components/CategoriesModal';
import { CategoriesPage } from './components/CategoriesPage';
import { SideMenu } from './components/SideMenu';
import { DeliveryTipsBanner } from './components/DeliveryTipsBanner';
import { Smartphone, Monitor, AlertCircle } from 'lucide-react';
import { vibrateAddToCart, vibrateCheckout } from './utils/haptics';
import { getActiveDeliveryAddress, addressToDeliveryLocation } from './services/addressService';
import { calculateDeliveryCharge } from './config/deliveryConfig';
import { getUserCart, saveUserCart, clearUserCart } from './services/cartService';
import { useLanguage } from './i18n';
import { getUserPreferences, saveUserPreferences } from './services/preferencesService';
import { AuthGuard } from './components/AuthGuard';
import { purgeSessionData, registerMemoryCleaner } from './utils/sessionClearance';
import {
  handleOrderPlacedNotificationSubscription,
  startOrderStatusNotificationWatcher,
} from './services/orderNotificationService';

export default function App() {
  // Real User State - Initialized from persistent active session (NO hardcoded fake/demo fallback)
  const [user, setUser] = useState<UserProfile>(() => {
    return (
      getActiveSession() || {
        id: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        isLoggedIn: false,
      }
    );
  });

  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('quickbasket_saved_location');
      }
      const session = getActiveSession();
      if (session && session.isLoggedIn && session.id) {
        const activeAddr = getActiveDeliveryAddress(session.id);
        if (activeAddr) {
          return addressToDeliveryLocation(activeAddr);
        }
      }
    } catch (e) {
      console.warn('Could not read saved delivery address:', e);
    }
    return null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals state
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Real Orders State - Loaded strictly for authenticated customer
  const [orders, setOrders] = useState<Order[]>(() => {
    const session = getActiveSession();
    if (session && session.isLoggedIn && session.id) {
      return getUserOrders(session.id);
    }
    return [];
  });

  // Customer-isolated Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const session = getActiveSession();
    if (session && session.isLoggedIn && session.id) {
      return getUserCart(session.id);
    }
    return [];
  });

  const { currentLanguage, setLanguage } = useLanguage();
  const isLoggingOutRef = useRef(false);

  // Keep customer cart synchronized in persistent customer storage
  useEffect(() => {
    if (isLoggingOutRef.current) return;
    if (user.isLoggedIn && user.id) {
      saveUserCart(user.id, cartItems);
    }
  }, [cartItems, user.isLoggedIn, user.id]);

  // Desktop view preference: 'mobile-frame' (390px) or 'expanded'
  const [viewMode, setViewMode] = useState<'mobile-frame' | 'expanded'>(() => {
    const session = getActiveSession();
    if (session && session.isLoggedIn && session.id) {
      const prefs = getUserPreferences(session.id);
      if (prefs.viewMode) return prefs.viewMode;
    }
    return 'mobile-frame';
  });

  // Sync user preferences (viewMode, language) on change when logged in
  useEffect(() => {
    if (isLoggingOutRef.current) return;
    if (user.isLoggedIn && user.id) {
      saveUserPreferences(user.id, { viewMode, language: currentLanguage });
    }
  }, [viewMode, currentLanguage, user.isLoggedIn, user.id]);

  // Permission-aware active order status notification watcher
  useEffect(() => {
    const unwatch = startOrderStatusNotificationWatcher(() => orders);
    return unwatch;
  }, [orders]);

  // Sync user login: Load ONLY this customer's data
  const handleLoginSuccess = (updatedUser: UserProfile) => {
    isLoggingOutRef.current = false;
    if (!updatedUser.id) {
      updatedUser.id = updatedUser.phone || updatedUser.email || `user_${Date.now()}`;
    }
    setUser(updatedUser);

    // 1. Load ONLY this customer's orders
    const userOrders = getUserOrders(updatedUser.id);
    setOrders(userOrders);

    // 2. Load ONLY this customer's cart
    const userCart = getUserCart(updatedUser.id);
    setCartItems(userCart);

    // 3. Load ONLY this customer's address
    const activeAddr = getActiveDeliveryAddress(updatedUser.id);
    if (activeAddr) {
      setSelectedLocation(addressToDeliveryLocation(activeAddr));
    } else {
      setSelectedLocation(null);
    }

    // 4. Load Customer's saved account preferences
    const prefs = getUserPreferences(updatedUser.id);
    if (prefs.language && (prefs.language === 'en' || prefs.language === 'kn')) {
      setLanguage(prefs.language);
    } else if (updatedUser.preferredLanguage) {
      setLanguage(updatedUser.preferredLanguage);
    }
    if (prefs.viewMode) {
      setViewMode(prefs.viewMode);
    }

    // Reset active order tracking to ensure previous customer order modal is not shown
    setActiveOrder(null);
  };

  // Register in-memory session cleaner callback
  useEffect(() => {
    const unregister = registerMemoryCleaner(() => {
      setUser({
        id: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        isLoggedIn: false,
      });
      setOrders([]);
      setSelectedLocation(null);
      setCartItems([]);
      setActiveOrder(null);
      setIsCartOpen(false);
      setIsLocationModalOpen(false);
      setIsLoginModalOpen(false);
      setIsCategoriesModalOpen(false);
      setSelectedProductDetail(null);
    });
    return unregister;
  }, []);

  const handleLogout = () => {
    isLoggingOutRef.current = true;

    // 1. Save Customer's permanent cart state before ending session
    if (user.isLoggedIn && user.id) {
      saveUserCart(user.id, cartItems);
    }

    // 2. End authenticated session and thoroughly purge localStorage, sessionStorage, and memory
    purgeSessionData({ preservePersistentVault: true });

    // 3. Clear Customer's Profile from in-memory React state
    const loggedOut: UserProfile = {
      id: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      isLoggedIn: false,
    };
    setUser(loggedOut);

    // 4. Clear Customer's Orders from UI
    setOrders([]);

    // 5. Clear Customer's Saved Addresses and selected delivery location
    setSelectedLocation(null);

    // 6. Clear Customer's customer-specific cart from React state
    setCartItems([]);

    // 7. Clear customer-specific checkout/session state & modals
    setActiveOrder(null);
    setIsCartOpen(false);
    setIsLocationModalOpen(false);
    setIsLoginModalOpen(false);
    setIsCategoriesModalOpen(false);
    setSelectedProductDetail(null);

    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 100);
  };

  // Reload orders when user state or auth changes: strictly isolated
  useEffect(() => {
    if (isLoggingOutRef.current) return;
    if (user.isLoggedIn && user.id) {
      const userOrders = getUserOrders(user.id);
      setOrders(userOrders);
    } else {
      setOrders([]);
    }
  }, [user.isLoggedIn, user.id]);

  // Total items in cart
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (acc, it) => acc + it.product.price * it.quantity,
    0
  );

  // Quick lookup dictionary for product counts in cart
  const cartItemCounts: Record<string, number> = {};
  cartItems.forEach((item) => {
    cartItemCounts[item.product.id] = item.quantity;
  });

  // Cart operations
  const handleAddToCart = (product: Product) => {
    vibrateAddToCart();
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((item) => item.product.id !== product.id);
      }
      return prev.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      );
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Reorder callback from Orders page
  const handleReorder = (itemsToReorder: CartItem[]) => {
    vibrateAddToCart();
    setCartItems((prev) => {
      const newCart = [...prev];
      for (const item of itemsToReorder) {
        const idx = newCart.findIndex((ci) => ci.product.id === item.product.id);
        if (idx >= 0) {
          newCart[idx].quantity += item.quantity;
        } else {
          newCart.push({ ...item });
        }
      }
      return newCart;
    });
    setIsCartOpen(true);
  };

  // Handle confirmed location selection
  const handleSelectLocation = (loc: DeliveryLocation) => {
    setSelectedLocation(loc);

    // Save to user account profile if logged in
    if (user.isLoggedIn) {
      const fullAddress = loc.formattedAddress || loc.area;
      const updated = updateRealUserProfile(user, { address: fullAddress });
      setUser(updated);
    }
  };

  // Real Checkout flow: Creates actual order from cart data and stores in persistent backend database
  const handleCheckout = (paymentMethod: 'cod' | 'upi' | 'card' = 'cod') => {
    if (cartItems.length === 0) return;

    // Check delivery area serviceability
    if (!selectedLocation) {
      setIsCartOpen(false);
      setIsLocationModalOpen(true);
      return;
    }

    const distanceKm = typeof selectedLocation.distanceKm === 'number' ? selectedLocation.distanceKm : undefined;
    const deliveryCharge = typeof distanceKm === 'number' ? calculateDeliveryCharge(distanceKm) : 0;

    if (typeof distanceKm === 'number' && deliveryCharge === null) {
      // Distance is above 5 km
      return;
    }

    if (selectedLocation.isServiceable === false) {
      return;
    }

    // Prompt real authentication if not logged in
    if (!user.isLoggedIn) {
      setIsCartOpen(false);
      setIsLoginModalOpen(true);
      return;
    }

    vibrateCheckout();

    const deliveryAddress =
      selectedLocation?.formattedAddress ||
      user.address?.trim() ||
      selectedLocation?.area ||
      'Customer Delivery Address';
    const userIdentifier = user.id || user.phone || user.email;
    if (!userIdentifier) {
      setIsLoginModalOpen(true);
      return;
    }

    const placedOrder = createNewOrder({
      userId: userIdentifier,
      items: cartItems,
      deliveryAddress,
      paymentMethod,
      deliveryFee: deliveryCharge,
      distanceKm,
    });

    // Update state with genuine persisted order
    setOrders((prev) => [placedOrder, ...prev]);
    setActiveOrder(placedOrder);
    setCartItems([]);
    if (user.id) {
      clearUserCart(user.id);
    }
    setIsCartOpen(false);
    setActiveTab('orders'); // Open Orders page directly

    // Request notification permission and subscribe strictly after successful order placement
    handleOrderPlacedNotificationSubscription(placedOrder).catch((err) => {
      console.debug('Order notification subscription status:', err);
    });
  };

  // Navigation tab handler: EXACTLY 4 options (🏠 Home | Categories | 📋 Orders | 👤 Profile)
  const handleTabChange = (tab: NavTab) => {
    if (tab === 'profile') {
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShopNow = (catName?: string) => {
    if (!catName || catName === 'Vegetables') {
      const el = document.getElementById('fresh-vegetables-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (catName) {
      openCategoryModal(catName);
    }
  };

  const openCategoryModal = (catName: string) => {
    setSelectedCategory(catName);
    setIsCategoriesModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#e8eee9] text-gray-900 flex flex-col items-center justify-start antialiased selection:bg-emerald-200">
      {/* Desktop view switcher (Mobile 390px vs Wide) */}
      <div className="hidden lg:flex fixed top-3 right-3 z-40 items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-gray-200 text-xs font-semibold text-gray-700">
        <span className="text-gray-400">View:</span>
        <button
          onClick={() => setViewMode('mobile-frame')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
            viewMode === 'mobile-frame'
              ? 'bg-[#064e3b] text-white shadow-xs'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile (390px)</span>
        </button>
        <button
          onClick={() => setViewMode('expanded')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
            viewMode === 'expanded'
              ? 'bg-[#064e3b] text-white shadow-xs'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Wide Desktop</span>
        </button>
      </div>

      {/* Main Container */}
      <div
        className={`w-full bg-[#f8faf9] min-h-screen flex flex-col shadow-2xl transition-all duration-300 relative ${
          viewMode === 'mobile-frame' ? 'max-w-[430px]' : 'max-w-4xl'
        }`}
      >
        {activeTab === 'home' ? (
          /* HOME PAGE */
          <>
            {/* 1. HEADER (Location, Account & Cart) */}
            <Header
              selectedLocation={selectedLocation}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              cartCount={cartCount}
              onOpenCart={() => setIsCartOpen(true)}
              user={user}
              onOpenAccount={() => setIsLoginModalOpen(true)}
              onOpenSideMenu={() => setIsSideMenuOpen(true)}
            />

            {/* 2. SEARCH BAR */}
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              products={ALL_PRODUCTS}
              onSelectProduct={(p) => setSelectedProductDetail(p)}
              onAddToCart={handleAddToCart}
              cartItemCounts={cartItemCounts}
            />

            {/* Outside Service Area Alert Banner */}
            {selectedLocation?.isServiceable === false && (
              <div className="px-3.5 pt-2">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-800 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-black block text-red-900">
                      Delivery is not available at this location.
                    </span>
                    <p className="text-[11px] text-red-700 mt-0.5 leading-tight">
                      The selected delivery address is outside our active delivery area. Please choose a location within our delivery zone.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(true)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-black text-red-700 underline hover:text-red-900 cursor-pointer"
                    >
                      <span>Change Delivery Location</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Subtle Delivery Tips Banner (Appears 5 minutes after confirmed order) */}
            <DeliveryTipsBanner
              orders={orders}
              onTrackOrder={(order) => setActiveOrder(order)}
            />

            {/* Main Content Area */}
            <main className="flex-1 pb-24 space-y-3">
              {/* 3. HERO BANNER */}
              <HomeHero onShopNow={handleShopNow} />

              {/* 4. CATEGORIES ROW */}
              <CategoryRow
                categories={CATEGORIES}
                onSelectCategory={(catName) => openCategoryModal(catName)}
                onViewAll={() => setActiveTab('categories')}
              />

              {/* 5. FRESH VEGETABLES (Product Cards) */}
              <div id="fresh-vegetables-section">
                <ProductCarouselSection
                  title="Fresh Vegetables"
                  subtitle="Sourced this morning from Tarikere & local farmers"
                  products={FRESH_VEGETABLES}
                  cartItemCounts={cartItemCounts}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                  onSelectProduct={(p) => setSelectedProductDetail(p)}
                />
              </div>

              {/* 6. FRESH FRUITS */}
              <ProductCarouselSection
                title="Fresh Fruits"
                subtitle="Sweet, hand-picked seasonal fruits"
                products={FRUITS}
                cartItemCounts={cartItemCounts}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onSelectProduct={(p) => setSelectedProductDetail(p)}
              />

              {/* 7. MILK & DAIRY */}
              <ProductCarouselSection
                title="Milk & Daily Dairy"
                subtitle="Nandini milk & fresh paneer delivered cold"
                products={MILK_AND_DAIRY}
                cartItemCounts={cartItemCounts}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onSelectProduct={(p) => setSelectedProductDetail(p)}
              />

              {/* 8. RICE & GRAINS */}
              <ProductCarouselSection
                title="Rice, Atta & Grains"
                subtitle="Daily kitchen essentials for Lakkavalli homes"
                products={RICE_AND_GRAINS}
                cartItemCounts={cartItemCounts}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onSelectProduct={(p) => setSelectedProductDetail(p)}
              />

              {/* 9. SNACKS & BEVERAGES */}
              <ProductCarouselSection
                title="Evening Snacks & Beverages"
                subtitle="Biscuits, tea, coffee & refreshing cold drinks"
                products={[...SNACKS, ...BEVERAGES]}
                cartItemCounts={cartItemCounts}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onSelectProduct={(p) => setSelectedProductDetail(p)}
              />

              {/* 10. HOUSEHOLD ESSENTIALS */}
              <ProductCarouselSection
                title="Cleaning & Household"
                subtitle="Soaps, detergents & daily cleaning items"
                products={HOUSEHOLD_ESSENTIALS}
                cartItemCounts={cartItemCounts}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onSelectProduct={(p) => setSelectedProductDetail(p)}
              />
            </main>
          </>
        ) : activeTab === 'categories' ? (
          /* CATEGORIES FULL PAGE */
          <CategoriesPage
            categories={CATEGORIES}
            allProducts={ALL_PRODUCTS}
            initialCategory={selectedCategory}
            cartItemCounts={cartItemCounts}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onSelectProduct={(p) => setSelectedProductDetail(p)}
            onBackToHome={() => setActiveTab('home')}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={cartCount}
          />
        ) : (
          /* ORDERS PAGE (Opens directly when user taps "Orders") */
          <AuthGuard
            isLoggedIn={user.isLoggedIn}
            userId={user.id}
            onRequireAuth={() => setIsLoginModalOpen(true)}
            onSessionCleared={() => {
              setOrders([]);
              setActiveOrder(null);
            }}
          >
            <OrdersPage
              orders={orders}
              cartItems={cartItems}
              userPhone={user.phone}
              userId={user.id}
              isLoggedIn={user.isLoggedIn}
              onBackToHome={() => setActiveTab('home')}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
              onPlaceOrderFromCart={() => handleCheckout('cod')}
              onReorder={handleReorder}
              onQuickAddItem={(product, qty) => {
                for (let i = 0; i < (qty || 1); i++) {
                  handleAddToCart(product);
                }
              }}
              onOrdersChange={(updated) => {
                if (user.isLoggedIn && user.id) {
                  saveUserOrders(user.id, updated);
                  setOrders(updated);
                } else {
                  setOrders([]);
                }
              }}
            />
          </AuthGuard>
        )}

        {/* BOTTOM NAVIGATION: EXACTLY 4 options (🏠 Home | Categories | 📋 Orders | 👤 Profile) */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          activeOrdersCount={orders.filter((o) => o.status !== 'delivered').length}
        />
      </div>

      {/* Cart & Checkout Sheet */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        location={selectedLocation}
        onChangeLocation={() => setIsLocationModalOpen(true)}
        onCheckout={handleCheckout}
      />

      {/* Location Selector Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedLocation={selectedLocation}
        onSelectLocation={handleSelectLocation}
        userId={user.isLoggedIn ? user.id : undefined}
      />

      {/* Login / Profile Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        user={user}
        orders={orders}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onTrackOrder={(order) => {
          setIsLoginModalOpen(false);
          setActiveOrder(order);
        }}
        onViewOrders={() => {
          setIsLoginModalOpen(false);
          setActiveTab('orders');
        }}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProductDetail}
        onClose={() => setSelectedProductDetail(null)}
        quantityInCart={selectedProductDetail ? cartItemCounts[selectedProductDetail.id] || 0 : 0}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
      />

      {/* Categories Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={CATEGORIES}
        allProducts={ALL_PRODUCTS}
        initialCategory={selectedCategory}
        cartItemCounts={cartItemCounts}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onSelectProduct={(p) => setSelectedProductDetail(p)}
      />

      {/* Live 10-Minute Order Tracking Modal */}
      <OrderSuccessModal
        isOpen={activeOrder !== null}
        onClose={() => {
          setActiveOrder(null);
          setActiveTab('orders');
        }}
        order={activeOrder}
        onOrdersChange={(newOrders) => setOrders(newOrders)}
      />

      {/* Side Drawer Navigation Menu */}
      <SideMenu
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        onNavigateToOrders={() => {
          setActiveTab('orders');
        }}
        onNavigateToCategories={() => {
          setActiveTab('categories');
        }}
        activeOrdersCount={orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length}
      />
    </div>
  );
}
