Feature: Authenticated Note Management
  Test note saving and editing features on the authenticated dashboard

  Scenario: Authenticated user can access dashboard with compose box
    Given I am authenticated
    And I navigate to the home page
    Then the compose box should be visible
    And the "Save" button should be visible

  Scenario: Create and save a note on authenticated dashboard
    Given I am authenticated
    And I navigate to the home page
    When I fill the compose box with "Authenticated note test"
    And I click the "Save" button
    Then I should see the new note in the sidebar

  Scenario: Navigate to notes page and verify saved notes
    Given I am authenticated
    And I navigate to the notes page
    Then the notes list should be visible
    And there should be at least one note in the sidebar
