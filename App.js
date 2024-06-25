import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ImageBackground, Image, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const Stack = createStackNavigator();

// IntroScreen
const IntroScreen = ({ navigation }) => {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const onGestureEvent = (event) => {
    translateY.value = event.nativeEvent.translationY;
  };

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationY < -100) {
        navigation.navigate('Home');
      }
      translateY.value = withSpring(0);
    }
  };

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
      <Animated.View style={[styles.introContainer, animatedStyle]}>
        <ImageBackground source={require('./assets/introimage.jpg')} style={styles.imageBackground}>
          <Image source={require('./assets/image.png')} style={styles.smallImage} />
          <Text style={styles.introText}>FLASHCARD QUIZ</Text>
          <Text style={styles.introText}>APP</Text>
          <Text style={styles.swipeText}>↑ Swipe up to start ↑</Text>
        </ImageBackground>
      </Animated.View>
    </PanGestureHandler>
  );
};

// HomeScreen
const HomeScreen = ({ navigation }) => {
  return (
    <ImageBackground source={require('./assets/introimage.jpg')} style={styles.imageBackground}>
      <View style={styles.container}>
        <TouchableOpacity style={[styles.homeButton, styles.addButton]} onPress={() => navigation.navigate('AddFlashcard')}>
          <Text style={styles.addButtonText}>Add Flashcard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.homeButton, styles.quizButton]} onPress={() => navigation.navigate('Quiz')}>
          <Text style={styles.quizButtonText}>Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.homeButton, styles.deleteButton]} onPress={() => navigation.navigate('DeleteFlashcard')}>
          <Text style={styles.deleteButtonText}>Delete Flashcard</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

// AddFlashcardScreen
const AddFlashcardScreen = ({ navigation }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('easy');

  const addFlashcard = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Error', 'Please enter both question and answer.', [{ text: 'OK' }]);
      return;
    }

    const flashcard = { question, answer, category };
    let flashcards = JSON.parse(await AsyncStorage.getItem('flashcards')) || [];
    flashcards.push(flashcard);
    await AsyncStorage.setItem('flashcards', JSON.stringify(flashcards));
    setQuestion('');
    setAnswer('');
    setCategory('easy');
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Question"
        value={question}
        onChangeText={setQuestion}
      />
      <TextInput
        style={styles.input}
        placeholder="Answer"
        value={answer}
        onChangeText={setAnswer}
      />
      <Text style={styles.label}>Select Category:</Text>
      <View style={styles.categoryContainer}>
        <TouchableOpacity onPress={() => setCategory('easy')}>
          <Text style={category === 'easy' ? styles.selectedCategory : styles.category}>Easy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCategory('normal')}>
          <Text style={category === 'normal' ? styles.selectedCategory : styles.category}>Normal</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCategory('hard')}>
          <Text style={category === 'hard' ? styles.selectedCategory : styles.category}>Hard</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.largeButton} onPress={addFlashcard}>
        <Text style={styles.buttonText}>Add Flashcard</Text>
      </TouchableOpacity>
    </View>
  );
};

// DeleteFlashcardScreen
const DeleteFlashcardScreen = ({ navigation }) => {
  const [flashcards, setFlashcards] = useState([]);

  useEffect(() => {
    const fetchFlashcards = async () => {
      const storedFlashcards = JSON.parse(await AsyncStorage.getItem('flashcards')) || [];
      setFlashcards(storedFlashcards);
    };
    fetchFlashcards();
  }, []);

  const deleteFlashcard = async (index) => {
    let updatedFlashcards = [...flashcards];
    updatedFlashcards.splice(index, 1);
    await AsyncStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
    setFlashcards(updatedFlashcards);
    Alert.alert('Deleted', `Flashcard #${index + 1} has been deleted`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={flashcards}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.flashcard}>
            <Text style={styles.questionText}>{`Question ${index + 1}: ${item.question}`}</Text>
            <Text style={styles.categoryText}>{`Category: ${item.category}`}</Text>
            <TouchableOpacity onPress={() => deleteFlashcard(index)}>
              <Text style={styles.deleteFlashcardText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

// QuizScreen
const QuizScreen = ({ navigation }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [category, setCategory] = useState('easy');
  const [categorySelected, setCategorySelected] = useState(false);

  useEffect(() => {
    const fetchFlashcards = async () => {
      const storedFlashcards = JSON.parse(await AsyncStorage.getItem('flashcards')) || [];
      setFlashcards(storedFlashcards.filter(card => card.category === category));
    };
    if (categorySelected) {
      fetchFlashcards();
    }
  }, [categorySelected]);

  const handleAnswerSubmit = () => {
    if (!userAnswer.trim()) {
      Alert.alert('Error', 'Please enter your answer.', [{ text: 'OK' }]);
      return;
    }

    const currentCard = flashcards[currentCardIndex];
    let newScore = score;
    const isCorrect = userAnswer.trim().toLowerCase() === currentCard.answer.trim().toLowerCase();
    if (isCorrect) {
      newScore += 1;
      setScore(newScore);
    }
    Alert.alert(
      isCorrect ? 'Correct!' : 'Incorrect',
      isCorrect ? `Your answer is correct\nScore: ${newScore}/${currentCardIndex + 1}` : `The correct answer was: ${currentCard.answer}\nScore: ${newScore}/${currentCardIndex + 1}`,
      [{ text: 'OK', onPress: goToNextCard }]
    );
  };

  const handleShowAnswer = () => {
    if (!userAnswer.trim()) {
      Alert.alert('Error', 'Please enter your answer.', [{ text: 'OK' }]);
      return;
    }

    const currentCard = flashcards[currentCardIndex];
    Alert.alert('Answer', `The correct answer is: ${currentCard.answer}`, [
      { text: 'OK', onPress: goToNextCard }
    ]);
  };

  const goToNextCard = () => {
    setShowAnswer(false);
    setUserAnswer('');
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex((prevIndex) => prevIndex + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleQuizCompletion = () => {
    Alert.alert('Quiz Completed', `Your final score: ${score}/${flashcards.length}`, [
      { text: 'OK', onPress: () => {
        setCurrentCardIndex(0);
        setScore(0);
        setQuizCompleted(false);
        navigation.navigate('Home');
      } }
    ]);
  };

  useEffect(() => {
    if (quizCompleted) {
      handleQuizCompletion();
    }
  }, [quizCompleted]);

  if (!categorySelected) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Select Category:</Text>
        <View style={styles.categoryContainer}>
          <TouchableOpacity onPress={() => { setCategory('easy'); setCategorySelected(true); }}>
            <Text style={category === 'easy' ? styles.selectedCategory : styles.category}>Easy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCategory('normal'); setCategorySelected(true); }}>
            <Text style={category === 'normal' ? styles.selectedCategory : styles.category}>Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCategory('hard'); setCategorySelected(true); }}>
            <Text style={category === 'hard' ? styles.selectedCategory : styles.category}>Hard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (flashcards.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noFlashcardsText}>No flashcards available in the selected category.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{flashcards[currentCardIndex].question}</Text>
      {showAnswer && <Text style={styles.answerText}>{flashcards[currentCardIndex].answer}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={userAnswer}
        onChangeText={setUserAnswer}
      />
      <TouchableOpacity style={styles.button} onPress={handleAnswerSubmit}>
        <Text style={styles.buttonText}>Submit Answer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleShowAnswer}>
        <Text style={styles.buttonText}>Show Answer</Text>
      </TouchableOpacity>
    </View>
  );
};

// App
const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerTransparent: true, headerTitle: '' }}>
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AddFlashcard" component={AddFlashcardScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="DeleteFlashcard" component={DeleteFlashcardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    marginVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
  },
  addButton: {
    backgroundColor: '#28a745',
  },
  quizButton: {
    backgroundColor: '#17a2b8',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  homeButton: {
    padding: 20,
    marginVertical: 70,
    borderRadius: 5,
    marginBottom: 40,
  },
  addButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 20,
  },
  quizButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 20,
  },
  deleteButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 20,
  },
  flashcard: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  questionText: {
    fontSize: 18,
    marginBottom: 10,
  },
  answerText: {
    fontSize: 16,
    marginBottom: 10,
  },
  deleteFlashcardText: {
    color: 'red',
    textAlign: 'center',
  },
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#fff',
  },
  swipeText: {
    fontSize: 27,
    color: '#fff',
    marginTop: 40,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  smallImage: {
    width: 350,
    height: 350,
    marginBottom: 25,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  category: {
    fontSize: 18,
    color: '#007BFF',
  },
  selectedCategory: {
    fontSize: 18,
    color: '#007BFF',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  largeButton: {
    backgroundColor: '#28a745',
    padding: 15,
    marginVertical: 10,
    borderRadius: 5,
  },
  noFlashcardsText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },
});

export default App;
