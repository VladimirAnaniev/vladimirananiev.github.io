# Bulgarian Thematic Vocabulary Generator

Generate comprehensive learning content for a Bulgarian vocabulary theme with multiple related words in JSON format. The output must include transliterations for all Bulgarian text and create interconnected exercises using words from the theme.

## Input
- **Theme**: [colors|numbers|family|body_parts|food|animals|clothing|places|transportation|weather|time|etc.]
- **Word Count**: [5-10 words]
- **Target Level**: [A1|A2]

## Required Output Structure

```json
{
  "themeId": "bg_theme_[theme_name]",
  "theme": "[theme name in English]",
  "themeTranslation": {
    "original": "[theme name in Bulgarian]",
    "transliteration": "[Latin script]",
    "translation": "[English translation]"
  },
  "words": [
    {
      "wordId": "bg_[theme]_001",
      "word": "[Bulgarian word]",
      "translation": "[English translation]",
      "transliteration": "[Latin script pronunciation]",
      "wordType": "[verb|noun|adjective|adverb]",
      "examples": [
        {
          "original": "[Bulgarian sentence]",
          "transliteration": "[Latin script]",
          "translation": "[English translation]"
        }
        // 2-3 examples per word
      ],
      "grammar": {
        "wordType": "[verb|noun|adjective|adverb]",
        "details": {
          // Same grammar structure as individual word prompt
        }
      }
    }
    // 5-10 words total
  ],
  "thematicExercises": [
    // 8-12 exercises that use multiple words from the theme
  ]
}
```

## Theme-Specific Word Selection

### Colors (цветове)
- **Core words**: червен (red), син (blue), жълт (yellow), зелен (green), черен (black), бял (white)
- **Extended**: оранжев (orange), лилав (purple), розов (pink), кафяв (brown)
- **Focus**: Gender agreement with adjectives, definite forms

### Numbers (числа)
- **Core words**: едно (one), две (two), три (three), четири (four), пет (five), шест (six)
- **Extended**: седем (seven), осем (eight), девет (nine), десет (ten)
- **Focus**: Cardinal vs ordinal forms, agreement with gender

### Family (семейство)
- **Core words**: майка (mother), баща (father), син (son), дъщеря (daughter), брат (brother), сестра (sister)
- **Extended**: дядо (grandfather), баба (grandmother), чичо (uncle), леля (aunt)
- **Focus**: Definite articles, possessive forms

### Body Parts (части на тялото)
- **Core words**: глава (head), око (eye), нос (nose), уста (mouth), ръка (hand), крак (leg)
- **Extended**: ухо (ear), коса (hair), зъб (tooth), сърце (heart)
- **Focus**: Plural forms, body-related expressions

### Food (храна)
- **Core words**: хляб (bread), мляко (milk), месо (meat), плод (fruit), зеленчук (vegetable)
- **Extended**: ябълка (apple), банан (banana), домат (tomato), картоф (potato)
- **Focus**: Articles, quantity expressions

## Thematic Exercise Types

### 1. Multi-word Fill Gap
Test multiple words from theme in context:
```json
{
  "type": "thematic_fill_gap",
  "question": {
    "original": "Моята любима _____ е _____ ябълка",
    "transliteration": "Moyata lyubima _____ e _____ yabalka",
    "translation": "My favorite _____ is a _____ apple"
  },
  "blanks": ["храна", "червена"],
  "options": [
    [
      {"original": "храна", "transliteration": "hrana", "translation": "food"},
      {"original": "пица", "transliteration": "pitsa", "translation": "pizza"},
      {"original": "книга", "transliteration": "kniga", "translation": "book"}
    ],
    [
      {"original": "червена", "transliteration": "chervena", "translation": "red (feminine)"},
      {"original": "червен", "transliteration": "cherven", "translation": "red (masculine)"},
      {"original": "червено", "transliteration": "cherveno", "translation": "red (neuter)"}
    ]
  ],
  "correctAnswers": ["храна", "червена"]
}
```

### 2. Thematic Matching
Match words within theme:
```json
{
  "type": "thematic_matching",
  "question": {
    "original": "Съчетайте цветовете с правилните форми:",
    "transliteration": "Sachetayte tsvetovete s pravilnite formi:",
    "translation": "Match the colors with correct forms:"
  },
  "pairs": [
    {
      "left": {"original": "червен мъж", "transliteration": "cherven mazh", "translation": "red man"},
      "right": {"original": "червена жена", "transliteration": "chervena zhena", "translation": "red woman"}
    }
  ]
}
```

### 3. Category Completion
Complete sentences using thematic vocabulary:
```json
{
  "type": "category_completion",
  "question": {
    "original": "В семейството ми има: майка, баща и _____",
    "transliteration": "V semeystvoto mi ima: mayka, bashta i _____",
    "translation": "In my family there is: mother, father and _____"
  },
  "options": [
    {"original": "брат", "transliteration": "brat", "translation": "brother"},
    {"original": "учител", "transliteration": "uchitel", "translation": "teacher"},
    {"original": "стол", "transliteration": "stol", "translation": "chair"},
    {"original": "кола", "transliteration": "kola", "translation": "car"}
  ],
  "correctAnswer": "брат"
}
```

### 4. Contextual Sentence Building
Build sentences using multiple thematic words:
```json
{
  "type": "thematic_sentence_order",
  "question": {
    "original": "Подредете думите за да опишете семейството:",
    "transliteration": "Podredete dumite za da opishete semeystvoto:",
    "translation": "Arrange the words to describe the family:"
  },
  "thematicContext": "family",
  "options": [
    {"original": "моята", "transliteration": "moyata", "translation": "my"},
    {"original": "майка", "transliteration": "mayka", "translation": "mother"},
    {"original": "и", "transliteration": "i", "translation": "and"},
    {"original": "баща", "transliteration": "bashta", "translation": "father"},
    {"original": "са", "transliteration": "sa", "translation": "are"},
    {"original": "добри", "transliteration": "dobri", "translation": "good"}
  ],
  "correctAnswer": "моята майка и баща са добри"
}
```

## Quality Requirements

1. **Thematic Coherence**: All words must belong to the specified theme
2. **Progressive Difficulty**: Start with basic words, add complexity
3. **Cultural Relevance**: Use culturally appropriate examples
4. **Grammar Integration**: Showcase how theme words follow Bulgarian grammar rules
5. **Practical Usage**: Create realistic scenarios where theme words naturally appear
6. **Cross-word Connections**: Exercises should involve multiple words from the theme
7. **A1-A2 Level**: Vocabulary and structures appropriate for beginners

## Example Themes to Generate

1. **Colors + Objects**: Teaching color adjectives with everyday items
2. **Numbers + Time**: Counting, telling time, ages, quantities  
3. **Family + Activities**: Family members doing activities together
4. **Food + Meals**: Meals, restaurants, cooking, preferences
5. **Body Parts + Health**: Describing symptoms, exercise, appearance
6. **Weather + Clothing**: What to wear in different weather
7. **Transportation + Places**: How to get to different locations
8. **Animals + Habitats**: Where animals live, animal characteristics

## Usage Instructions

1. Select a theme from the list above
2. Choose 5-10 core words for A1-A2 level
3. Generate 2-3 examples per word showing thematic context
4. Create 8-12 exercises that combine multiple theme words
5. Ensure exercises test grammar within thematic context
6. Include realistic scenarios where theme vocabulary is used

Generate the complete thematic vocabulary content now for the specified theme.