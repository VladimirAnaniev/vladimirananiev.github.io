# Language Learning Flashcards

A modern web-based language learning application using spaced repetition flashcards to help you master vocabulary effectively.

## 🚀 Features

- **Spaced Repetition Algorithm**: Optimized learning schedule based on your performance
- **Multiple Language Support**: English, Hungarian, and Bulgarian
- **Interactive Flashcards**: Click to toggle between word and translation/examples
- **Comprehensive Examples**: View all examples in both source and target languages
- **Progress Tracking**: Monitor your learning progress with detailed statistics
- **Couples Mode**: Special mode for learning multiple target languages simultaneously
- **Data Management**: Export and import your learning progress
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🎯 How to Use

1. **Select Language Pair**: Choose your source and target languages from the dropdown
2. **Start Learning**: Click "Start Learning" to begin your session
3. **Study Cards**: 
   - Click the flashcard to see the translation and examples
   - Click again to go back to the original word
   - Use spacebar as a shortcut to flip cards
4. **Respond**: Mark whether you knew the word or not
5. **Track Progress**: View your session statistics and overall progress

## 🎮 Keyboard Shortcuts

- **Spacebar**: Flip the current card
- **Y**: Mark as "I Know It" (when answer is revealed)
- **N**: Mark as "Don't Know" (when answer is revealed)

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Storage**: Browser LocalStorage
- **Architecture**: Modular ES6 classes

## 🏃‍♂️ Running Locally

1. Clone this repository
2. Open `index.html` in your browser, or
3. Use a local server:
   ```bash
   # Using Node.js (if you have it installed)
   node server.js
   
   # Or using Python
   python -m http.server 8000
   
   # Or using any other static file server
   ```

## 📱 Mobile Support

The app is fully responsive and works great on mobile devices with touch interactions.

## 🔧 Settings

- **Language Pair**: Switch between different language combinations
- **Daily Cards**: Adjust the number of cards per session (10-100)
- **Couples Mode**: Learn multiple target languages simultaneously
- **Data Export/Import**: Backup and restore your progress

## 📊 Learning Algorithm

The app uses a sophisticated spaced repetition algorithm that:
- Increases intervals for words you know well
- Decreases intervals for words you struggle with
- Optimizes review timing for long-term retention
- Tracks performance metrics for continuous improvement

## 🤝 Contributing

This is an open-source project. Feel free to submit issues, feature requests, or pull requests!

## 📄 License

This project is open source and available under the MIT License.

---

**Live Demo**: [Try it here!](https://yourusername.github.io/language-learning)