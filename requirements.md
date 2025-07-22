# Language Learning App Requirements

## Overview
A web-based language learning application for complete beginners using spaced repetition and flashcards. The app will be deployed as a GitHub Pages site with no backend dependency.

## Core Features

### 1. User Experience
- **Target Audience**: Complete language learning beginners
- **Daily Learning**: 50 flashcards per day
- **Interface**: Simple, intuitive web interface
- **No Registration**: Uses browser storage, no account required

### 2. Language Support
- **Base Languages**: English, Bulgarian, Hungarian
- **Supported Learning Paths**:
  - English → Hungarian
  - English → Bulgarian  
  - Hungarian → English
  - Hungarian → Bulgarian
- **Future Expansion**: Architecture should support additional languages

### 3. Flashcard System
- **Word Selection**: Most common words in each language
- **Daily Queue**: 50 cards presented per day
- **Question Format**: Show word, user guesses meaning
- **Retry Logic**: Incorrect words move to back of daily queue until guessed correctly

### 4. Spaced Repetition Algorithm
- **Bucket System**: Multiple review intervals based on user performance
- **Scheduling**: Cards reappear based on success/failure history
- **Intervals**: Progressive spacing (e.g., 1 day, 3 days, 1 week, 2 weeks, 1 month)
- **Performance Tracking**: Success rate influences next review date

### 5. Content Structure
- **Word Database**: Common vocabulary with translations
- **Examples**: 2-3 example sentences per word in all supported languages
  - Format: "dog - The dog barked loudly. Agi loves dogs."
- **Context**: Real-world usage examples for better retention

### 6. Couples Mode (Optional Feature)
- **Activation**: Toggle-able feature
- **Display**: Show English word + both Bulgarian and Hungarian translations
- **Use Case**: Partners learning different languages simultaneously

### 7. Data Storage
- **Technology**: Browser APIs (localStorage/indexedDB)
- **Persistence**: All user progress saved locally
- **Data Structure**: 
  - User preferences
  - Learning progress
  - Spaced repetition schedules
  - Performance statistics

### 8. Statistics & Analytics
- **Performance Metrics**:
  - Words known vs unknown
  - Learning streak
  - Daily completion rate
  - Success rate per word
  - Time spent learning
- **Progress Tracking**: Visual progress indicators
- **Historical Data**: Performance over time

### 9. Technical Requirements
- **Frontend**: Modern web technologies (HTML5, CSS3, JavaScript)
- **Deployment**: GitHub Pages compatible
- **Offline Support**: Service worker for offline functionality
- **Responsive**: Mobile and desktop friendly
- **No Backend**: Complete client-side application

## User Flow

### Daily Session
1. User opens app
2. Daily queue loads (50 cards)
3. Card shows source language word
4. User attempts to guess/recall meaning
5. User reveals answer
6. User marks as "known" or "unknown"
7. Unknown cards cycle to back of queue
8. Session completes when all 50 cards are marked "known"

### Spaced Repetition Flow
1. Completed cards scheduled for future review
2. Schedule based on performance history
3. Due cards automatically added to daily queue
4. Bucket system manages review intervals

## Data Models

### Word Entry
```
{
  id: string,
  word: string,
  language: string,
  translations: {
    en: string,
    bg: string,
    hu: string
  },
  examples: {
    en: string[],
    bg: string[],
    hu: string[]
  },
  frequency_rank: number
}
```

### User Progress
```
{
  word_id: string,
  learning_path: string,
  bucket_level: number,
  last_reviewed: date,
  next_review: date,
  success_count: number,
  failure_count: number,
  consecutive_successes: number
}
```

## Success Criteria
- Users can complete daily 50-card sessions
- Spaced repetition effectively reinforces learning
- Progress persists across browser sessions
- App works offline after initial load
- Smooth experience across devices
- Clear visual feedback and progress indicators

## Future Enhancements
- Audio pronunciation
- Additional languages
- Import/export progress
- Social features (if backend added)
- Advanced statistics dashboard
- Customizable daily card count