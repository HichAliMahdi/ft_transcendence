Ft_transcendence

/// TO DO FOR NEXT ////
1 - ✅ Add online offline status (COMPLETED)
2 - ✅ Add the possibility to see if the person is online or busy or offline (COMPLETED - with realtime updates)
3 - Add avatars
4 - Check for bugs and fixes

/// IMPLEMENTED ///
- Database migration system for safe schema updates
- Realtime presence broadcasting via WebSocket
- Full status system: Online (green), Busy (red), Away (yellow), Offline (gray)
- Visual status indicators with color-coded dots and glowing effects
- Automatic online/offline detection based on WebSocket connections
- Status selector integrated into Friends widget for better UX
- Real-time friend status updates without requiring widget refresh
- Proper Offline status on logout and WebSocket disconnect
- Beautiful status badges in friend widget with emojis and color coding
- Personal status section at the top of Friends widget
- Status indicator dot next to username in header
- Clean, non-redundant status display throughout the UI
- Fully Tailwind CSS-based styling (no inline styles)

/// RECENT IMPROVEMENTS ///
- Converted all inline styles to Tailwind CSS utility classes
- Cleaned up custom CSS and replaced with Tailwind utilities
- Improved maintainability with consistent styling approach
- Better responsive design with Tailwind's breakpoint system
- Enhanced code readability with declarative Tailwind classes