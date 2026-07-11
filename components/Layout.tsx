import React, { ReactNode, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer'; // <-- CRITICAL FIX: Restore Footer import

interface LayoutProps {
  children: ReactNode;
  isHomePage?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, isHomePage = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="text-text-light-primary dark:text-text-dark-primary min-h-screen flex flex-col font-sans antialiased">
      <Header toggleSidebar={toggleSidebar} isHomePage={isHomePage} />
      
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar - Conditionally Rendered */}
        {!isHomePage && <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />}
        
        {/* Overlay for mobile - Conditionally Rendered */}
        {!isHomePage && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden" // Only visible on mobile
            onClick={closeSidebar}
            aria-hidden="true"
          ></div>
        )}

         <main
          id="main-content"
          tabIndex={-1} // lets JS focus it, but keeps it out of tab order
          className={`flex-1 p-4 w-full min-w-0 ${!isHomePage && isSidebarOpen ? 'md:ml-0' : ''} focus:outline-none`}
        >
          {children}
        </main>

      </div>
      <Footer />
    </div>
  );
};

export default Layout;
