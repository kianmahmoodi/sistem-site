import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BurgerIntro } from './components/BurgerIntro';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { AccountPage } from './pages/AccountPage';
import { CashierPage } from './pages/CashierPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { LegalPage } from './pages/LegalPage';
import { LoginPage } from './pages/LoginPage';
import { ManagerPage } from './pages/ManagerPage';
import { OrderPage } from './pages/OrderPage';
import { SuperAdminPage } from './pages/SuperAdminPage';

const STAFF_PREFIXES = ['/admin', '/manager', '/cashier'];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const isStaff = STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!isStaff && <BurgerIntro />}
      {!isStaff && <Header />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:orderNumber" element={<OrderPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<SuperAdminPage />} />
          <Route path="/admin/:section" element={<SuperAdminPage />} />
          <Route path="/manager" element={<ManagerPage />} />
          <Route path="/manager/:section" element={<ManagerPage />} />
          <Route path="/cashier" element={<CashierPage />} />
          <Route path="/cashier/:section" element={<CashierPage />} />
          <Route
            path="/privacy"
            element={
              <LegalPage
                title="Privacy Policy"
                updated="November 2026"
                sections={[
                  {
                    heading: 'What we collect',
                    body: 'We collect the details you give us when you order or subscribe: your name, phone number, email address, delivery address and order history. We never store payment card details on our own servers.',
                  },
                  {
                    heading: 'How we use it',
                    body: 'Your details are used to prepare and deliver your order, to contact you about it, and — if you opt in — to send you offers. We do not sell your personal data.',
                  },
                  {
                    heading: 'Your choices',
                    body: 'You can ask us to delete your account data at any time by emailing our team. Newsletter emails always include an unsubscribe link.',
                  },
                  {
                    heading: 'Cookies',
                    body: 'We use a small session cookie to keep you signed in and browser storage to remember your shopping bag. No advertising trackers are used.',
                  },
                ]}
              />
            }
          />
          <Route
            path="/terms"
            element={
              <LegalPage
                title="Terms and Conditions"
                updated="November 2026"
                sections={[
                  {
                    heading: 'Orders',
                    body: 'An order is confirmed once our team accepts it. Prices, availability and delivery times are shown at checkout and may change during busy periods.',
                  },
                  {
                    heading: 'Delivery',
                    body: 'Delivery is available within our service area during opening hours. Free delivery applies to orders above the threshold shown in the cart. Please provide an accurate address and phone number.',
                  },
                  {
                    heading: 'Cancellations and refunds',
                    body: 'You can cancel an order before it goes into preparation by calling the restaurant. If something is wrong with your food, contact us the same day and we will make it right.',
                  },
                  {
                    heading: 'Payment',
                    body: 'Cash on delivery is currently the only payment method. No card details are collected through this website.',
                  },
                ]}
              />
            }
          />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>

      {!isStaff && <Footer />}
      <CartDrawer />
    </div>
  );
}
