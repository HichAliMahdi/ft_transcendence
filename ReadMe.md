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
- Users can now select Offline status manually

/// RECENT IMPROVEMENTS ///
- Moved status selector from header into Friends widget for cleaner interface
- Added visual status selection with clickable buttons and checkmarks
- Enhanced Friends widget with personal status management section
- Streamlined header to show only welcome message and logout button