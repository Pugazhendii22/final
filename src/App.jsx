import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminSetup from './pages/AdminSetup';
import StaffManagement from './pages/admin/StaffManagement';
import CustomerList from './pages/customers/CustomerList';
import CustomerView from './pages/customers/CustomerView';
import SecondHandList from './pages/inventory/SecondHandList';
import SecondHandView from './pages/inventory/SecondHandView';
import ProductList from './pages/products/ProductList';
import ProductView from './pages/products/ProductView';
import ServiceOrderList from './pages/service/ServiceOrderList';
import ServiceOrderView from './pages/service/ServiceOrderView';
import SalesList from './pages/sales/SalesList';
import SalesView from './pages/sales/SalesView';
import EnquiryList from './pages/enquiries/EnquiryList';
import EnquiryView from './pages/enquiries/EnquiryView';
import LabelRegistryList from './pages/admin/LabelRegistryList';
import ReportsPage from './pages/reports/ReportsPage';
import TaskManagement from './pages/admin/TaskManagement';
import MyTasks from './pages/staff/MyTasks';
import ScanResult from './pages/scan/ScanResult';
import ScannerPage from './pages/scan/ScannerPage';
import RatingPage from './pages/rating/RatingPage';
import RatingsList from './pages/admin/RatingsList';
import { AuthProvider, useAuth } from './context/AuthContext';
import PWAInstallPrompt from './components/PWAInstallPrompt';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/setup" element={<AdminSetup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/rate/:token" element={<RatingPage />} />
          <Route path="/scan/:labelNumber" element={<ScanResult />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/labels" 
            element={
              <ProtectedRoute>
                <LabelRegistryList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/scanner" 
            element={
              <ProtectedRoute>
                <ScannerPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers" 
            element={
              <ProtectedRoute>
                <CustomerList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers/:id" 
            element={
              <ProtectedRoute>
                <CustomerView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory/second-hand" 
            element={
              <ProtectedRoute>
                <SecondHandList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory/second-hand/:id" 
            element={
              <ProtectedRoute>
                <SecondHandView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products" 
            element={
              <ProtectedRoute>
                <ProductList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products/:id" 
            element={
              <ProtectedRoute>
                <ProductView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/service" 
            element={
              <ProtectedRoute>
                <ServiceOrderList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/service/:id" 
            element={
              <ProtectedRoute>
                <ServiceOrderView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sales" 
            element={
              <ProtectedRoute>
                <SalesList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sales/:id" 
            element={
              <ProtectedRoute>
                <SalesView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/enquiries" 
            element={
              <ProtectedRoute>
                <EnquiryList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/enquiries/:id" 
            element={
              <ProtectedRoute>
                <EnquiryView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/staff" 
            element={
              <ProtectedRoute>
                <StaffManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/tasks" 
            element={
              <ProtectedRoute>
                <TaskManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/ratings" 
            element={
              <ProtectedRoute>
                <RatingsList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tasks" 
            element={
              <ProtectedRoute>
                <MyTasks />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <PWAInstallPrompt />
    </AuthProvider>
  );
}

export default App;
