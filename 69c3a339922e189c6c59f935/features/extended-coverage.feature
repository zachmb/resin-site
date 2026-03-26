Feature: Extended Application Coverage
  Comprehensive tests across all major features

  Scenario: Home page loads without JavaScript errors
    Given I navigate to the home page
    Then the page should render without console errors
    And the main content should be visible

  Scenario: Notes page navigation works
    Given I navigate to the notes page
    Then I should see the page navigation
    And the URL should contain "/notes"

  Scenario: Amber page navigation works
    Given I navigate to the amber page
    Then I should see the page navigation
    And the URL should contain "/amber"

  Scenario: Map page navigation works
    Given I navigate to the map page
    Then the map canvas should be rendered
    And the URL should contain "/map"

  Scenario: Rewards page navigation works
    Given I navigate to the rewards page
    Then the page should be accessible
    And the URL should contain "/rewards"

  Scenario: Focus page navigation works
    Given I navigate to the focus page
    Then the page should be accessible
    And the URL should contain "/focus"

  Scenario: Login page has required fields
    Given I navigate to the login page
    Then I should see authentication options
    And the page should be secured

  Scenario: All navigation links are present
    Given I navigate to the home page
    Then the sidebar should have navigation links
    And the navigation should be functional

  Scenario: Form validation prevents empty submissions
    Given I navigate to the home page
    When I try to save without entering content
    Then the save should be rejected
    And the user should see validation feedback

  Scenario: Special characters in notes are preserved
    Given I navigate to the home page
    When I fill the compose box with "Test: @#$%^&*()"
    And I click the "Save" button
    Then the special characters should be preserved

  Scenario: Long content doesn't break the UI
    Given I navigate to the home page
    When I fill the compose box with a 500-character string
    And I click the "Save" button
    Then the note should be created without errors

  Scenario: Multiple navigation in sequence works
    Given I navigate to the home page
    When I navigate to the notes page
    And I navigate to the amber page
    And I navigate to the map page
    And I navigate back to the home page
    Then each page should load correctly

  Scenario: Browser back button works
    Given I navigate to the home page
    When I navigate to the notes page
    And I use the browser back button
    Then I should be back on the home page

  Scenario: Page refresh preserves state
    Given I navigate to the notes page
    When I refresh the page
    Then the notes page should reload correctly

  Scenario: Links in navigation have correct href attributes
    Given I navigate to the home page
    Then all navigation links should have href attributes
    And links should point to valid routes

  Scenario: Images load without errors
    Given I navigate to the home page
    Then logo image should load
    And no image 404 errors should occur

  Scenario: CSS loads and applies correctly
    Given I navigate to the home page
    Then the page should have proper styling
    And elements should be visible

  Scenario: Mobile viewport behaves correctly
    Given I set viewport to mobile size
    And I navigate to the home page
    Then the page should be responsive
    And mobile menu should work

  Scenario: Keyboard navigation works
    Given I navigate to the home page
    When I press Tab to navigate
    Then focus should move through elements
    And focus order should be logical

  Scenario: ARIA labels are present
    Given I navigate to the home page
    Then interactive elements should have accessible labels
    And screen readers should work

  Scenario: Color contrast is sufficient
    Given I navigate to the home page
    Then text should have sufficient contrast
    And UI should be readable

  Scenario: Buttons are accessible
    Given I navigate to the home page
    Then all buttons should be keyboard accessible
    And buttons should have descriptive labels

  Scenario: Form inputs have labels
    Given I navigate to the home page
    Then form inputs should be associated with labels
    And labels should be visible

  Scenario: Error messages are clear
    Given I navigate to the home page
    When I submit an empty form
    Then error messages should be displayed
    And error messages should be clear

  Scenario: Success messages appear after save
    Given I navigate to the home page
    When I save a note successfully
    Then a success indicator should appear
    And the compose box should clear

  Scenario: Loading states are visible
    Given I navigate to the home page
    When I save a note
    Then a loading indicator should appear
    And the save button should show progress

  Scenario: Empty states are handled gracefully
    Given I navigate to the notes page
    When the user has no notes
    Then an empty state message should appear
    And a call-to-action should be visible

  Scenario: Data consistency across pages
    Given I navigate to the home page
    And I view the recent notes
    When I navigate to the notes page
    Then the notes list should match

  Scenario: Timestamps display correctly
    Given I navigate to the notes page
    Then timestamps should be formatted correctly
    And dates should be readable

  Scenario: Search functionality works
    Given I navigate to the notes page
    When I search for a note
    Then search results should appear
    And search should be case-insensitive

  Scenario: Sorting works correctly
    Given I navigate to the notes page
    When I sort the notes
    Then notes should be ordered correctly

  Scenario: Filtering works correctly
    Given I navigate to the notes page
    When I filter by status
    Then only matching notes should appear

  Scenario: Pagination works if applicable
    Given I navigate to the notes page
    When there are many notes
    Then pagination should work
    And page navigation should be visible

  Scenario: Infinite scroll works if applicable
    Given I navigate to the notes page
    When I scroll to the bottom
    Then more notes should load automatically

  Scenario: Copy to clipboard works
    Given I navigate to the notes page
    When I copy a note
    Then the note should be in clipboard
    And a confirmation should appear

  Scenario: Export functionality works
    Given I navigate to the notes page
    When I export notes
    Then the export should start
    And the file should be downloadable

  Scenario: Sharing functionality is available
    Given I navigate to the notes page
    When I try to share a note
    Then sharing options should appear

  Scenario: Archive functionality works
    Given I navigate to the notes page
    When I archive a note
    Then the note should disappear from list
    And an undo option should appear

  Scenario: Delete confirmation appears
    Given I navigate to the notes page
    When I delete a note
    Then a confirmation dialog should appear
    And delete should require confirmation

  Scenario: Undo functionality works
    Given I navigate to the notes page
    When I delete a note and undo
    Then the note should reappear

  Scenario: Bulk actions work
    Given I navigate to the notes page
    When I select multiple notes
    Then bulk action buttons should appear
    And actions should apply to all selected

  Scenario: Favorites/pinning works
    Given I navigate to the notes page
    When I favorite a note
    Then it should be marked as favorite
    And favorites should appear first

  Scenario: Tags/categories work
    Given I navigate to the notes page
    When I add a tag to a note
    Then the tag should appear
    And filtering by tag should work

  Scenario: Color coding works
    Given I navigate to the notes page
    When I color code a note
    Then the color should apply
    And color filtering should work

  Scenario: Permissions are enforced
    Given I navigate to the notes page
    When I try to edit another user's note
    Then edit should be prevented
    And an error should appear

  Scenario: Rate limiting prevents abuse
    Given I navigate to the home page
    When I make many rapid requests
    Then rate limiting should engage
    And requests should be throttled
