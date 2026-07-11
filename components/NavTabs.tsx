import React from 'react';
import { NavLink } from 'react-router-dom';
import { ALL_TOOLS } from '../constants';
import { getThemeForToolId } from '../utils/toolTheme';

const NavTabs: React.FC = () => {
  return (
    <div className="mb-6 border-b border-border-light dark:border-border-dark">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 no-scrollbar overflow-x-auto pb-2">
        {ALL_TOOLS.map(tab => {
          const theme = getThemeForToolId(tab.id);
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) =>
                `py-2 px-3 text-sm font-medium border-b-2 transition-colors text-center whitespace-nowrap rounded-t-xl ${
                  isActive
                    ? `${theme.dropdownActive} border-current`
                    : `border-transparent text-text-light-secondary ${theme.dropdownHover} dark:text-text-dark-secondary`
                }`
              }
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default NavTabs;
