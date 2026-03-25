Feature: Note Management
  Comprehensive tests for note creation, editing, and saving

  Scenario: Create note via dashboard quick compose
    Given I navigate to the home page
    When I fill the compose box with "Test note from dashboard"
    And I click the "Save" button
    Then I should be redirected to the notes page with a temp ID
    And the note content should display "Test note from dashboard"

  Scenario: Auto-save persists draft content
    Given I navigate to the notes page
    When I create a new note
    And I type "Auto-save test content" in the editor
    And I wait for auto-save to complete
    And I refresh the page
    Then the note content should still be "Auto-save test content"

  Scenario: Edit existing note and save
    Given I navigate to the notes page
    When I select the first note in the sidebar
    And I add text " - edited" to the editor
    And I wait for auto-save to complete
    And I refresh the page
    Then the note should contain " - edited"

  Scenario: Note title updates in sidebar on edit
    Given I navigate to the notes page
    When I select the first note in the sidebar
    And I change the first line to "New Title"
    And I wait for auto-save to complete
    Then the sidebar should show "New Title" for that note

  Scenario: Multiple notes can be created and switched
    Given I navigate to the notes page
    When I create a new note with content "First note"
    And I save the note
    And I create a new note with content "Second note"
    And I save the note
    And I click the first note in the sidebar
    Then the editor should display "First note"
    When I click the second note in the sidebar
    Then the editor should display "Second note"

  Scenario: Delete note removes from sidebar
    Given I navigate to the notes page
    When I create a new note with content "Note to delete"
    And I save the note
    And I delete the current note
    Then the note should not appear in the sidebar

  Scenario: Instant activation navigates to amber page
    Given I navigate to the notes page
    When I select the first note
    And I click the "Activate" button
    Then I should be redirected to the amber page
    And a loading state should be visible

  Scenario: Draft persistence across navigation
    Given I navigate to the notes page
    When I create a new note
    And I type "Unsaved draft content" in the editor
    And I navigate away and back to notes
    Then the draft should be restored from localStorage
    And the editor should show "Unsaved draft content"
