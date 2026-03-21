# HivePulse v1.4.0 Release Notes

This release brings a host of new features, improvements, and bug fixes to enhance your Hive experience. Here's a summary of what's new since version 1.2.2:

## ✨ New Features

*   **Enhanced User Search:** Finding users is now easier with Hive avatars, selection feedback, and standardized frontend paths in UserSearch.
*   **3Speak Integration:** We've integrated support for 3Speak, allowing for a more comprehensive Hive experience.
*   **User Notifications (The Pulse):** Stay updated with the new user notifications view (The Pulse) under user stats.
*   **User Search:** A new user search feature has been implemented.
*   **Hive/HBD Price Display:** The stats page now displays Hive/HBD prices.
*   **Custom Frontend Support:** You now have the ability to add and manage custom frontends.
*   **Frontend Management:** A new setting allows you to activate, deactivate, and reorder your preferred frontends.
*   **Badge Prioritization:** Choose what's more important to you with a new setting to switch between prioritizing message count or VP/RC for the extension badge.
*   **Ecency Chat & Notifications:** Enhanced support for Ecency chat and notifications with dynamic loading.
*   **Expanded dApp Ecosystem:** Discover more of the Hive ecosystem with an expanded and categorized list of dApps, complete with their logos. We've also added HiveScan and updated logos for Tribaldex and HiveStats.
*   **Infinite Scroll for Notifications:** You can now seamlessly scroll through your notifications with the new "load more" and infinite scroll functionality in The Pulse.
*   **Real-time Hive Price Tracker:** Keep an eye on the market with the new real-time Hive price tracker in the header.
*   **Bad Actor List Integration:** An up-to-date Bad Actor List from Syncad GitLab has been integrated to help you stay safe.
*   **Privacy Policy:** A privacy policy has been added.

## 🚀 Improvements

*   **UI Enhancements:**
    *   The HIVE name is now highlighted, and price sources in the header have been clarified for better readability.
    *   The user interface for mention notifications in The Pulse has been refined.
    *   A fixed display for VP/RC has been implemented in the upper toolbar.
    *   The login experience has been improved with a new top bar.
*   **Logout Functionality:** Logging out now correctly hides badges and new message notifications.
*   **Error Messaging:** We've improved the error message for when a tab is empty.
*   **Badge Display:** The extension badge display has been enhanced to prevent text cutoff.
*   **Username Display:** Redundant username display has been removed for a cleaner look.

## 🐞 Bug Fixes

*   **Missing Imports and Function Calls:** We've restored missing imports and fixed `getTargetUrl`/`parseUrl` calls with new signatures.
*   **Logo Fixes:** Actifit has been restored, BlockTrades removed, and logos for HiveStats and PeakMonsters have been fixed.
*   **Build Error:** A build error related to the Hive/HBD price display in the stats page has been resolved.
*   **Custom Frontend Detection:** We've fixed an issue with the detection of custom frontends in the switcher tab.
*   **Badge Update Delay:** A delay in updating the extension badge content has been fixed.
*   **Unread Message Count:** An issue with updating the unread message count on the fly has been resolved.
*   **Scripting Permission:** Unnecessary scripting permission has been removed.
