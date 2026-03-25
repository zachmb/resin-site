Feature: Comprehensive Background Save Validation
  Tests that verify actual network requests, responses, and data persistence

  Scenario: Background save request succeeds with valid response
    Given I navigate to the home page
    When I fill the compose box with "Test background save"
    And I click the "Save" button
    Then the background save request should complete successfully
    And the response should contain a valid note ID

  Scenario: Navigation happens before background save completes
    Given I navigate to the home page
    When I fill the compose box with "Fast navigation test"
    And I click the "Save" button
    Then I should navigate to notes page within 1 second
    And the background save can complete independently

  Scenario: Compose box clears after successful save
    Given I navigate to the home page
    And the compose box contains "Test content"
    When I click the "Save" button
    Then the compose box should be empty
    And the success indicator should briefly appear

  Scenario: Multiple rapid saves don't conflict
    Given I navigate to the home page
    When I fill the compose box with "First note"
    And I click the "Save" button
    And I wait for 500 milliseconds
    And I fill the compose box with "Second note"
    And I click the "Save" button
    Then both notes should be created successfully

  Scenario: Empty content is rejected
    Given I navigate to the home page
    When I click the "Save" button with empty content
    Then the save action should fail with validation error
    And the compose box should still be visible

  Scenario: Network errors don't break the UI
    Given I navigate to the home page
    And the server is simulating a network error
    When I fill the compose box with "Test error handling"
    And I click the "Save" button
    Then the UI should remain functional
    And I should be able to try saving again

  Scenario: Save button disabled while saving
    Given I navigate to the home page
    When I fill the compose box with "Test button state"
    And I click the "Save" button
    Then the "Save" button should be disabled during save
    And it should re-enable after completion or failure

  Scenario: Note content is preserved during optimistic navigation
    Given I navigate to the home page
    And I fill the compose box with "Multi-line test\nWith multiple\nLines of content"
    When I click the "Save" button
    Then the notes editor should display the exact same content
    And no content should be lost during save

  Scenario: Form action (quickSchedule) also uses correct path
    Given I navigate to the home page
    When I fill the compose box with "Schedule test"
    And I click the "Activate" button
    Then the form should POST to the correct endpoint
    And the response should indicate success or proper redirect

  Scenario: Cache invalidation works after save
    Given I navigate to the home page
    When I fill the compose box with "Cache test"
    And I click the "Save" button
    Then localStorage cache keys should be cleared
    And next data fetch should retrieve fresh data from server

  Scenario: Unsaved changes warning if user leaves during save
    Given I navigate to the home page
    And I fill the compose box with "Unsaved test"
    When I click the "Save" button
    And I try to navigate away before save completes
    Then the browser should warn about unsaved changes

  Scenario: Load indicator shows during save
    Given I navigate to the home page
    When I fill the compose box with "Loading indicator test"
    And I click the "Save" button
    Then a loading spinner should appear
    And it should disappear when save completes

  Scenario: Error message shows on save failure
    Given I navigate to the home page
    And the server will reject the request
    When I fill the compose box with "Error test"
    And I click the "Save" button
    Then an error message should be displayed to the user
    And the user should be able to retry
