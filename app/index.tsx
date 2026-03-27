import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Feather, Ionicons } from '@expo/vector-icons'; // <-- ADDED VECTOR ICONS
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, LayoutAnimation, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import EmptyState from '../components/EmptyState';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import { COLORS } from '../constants/theme';
import { auth, db } from '../firebaseConfig';
import { getAutocompleteSuggestions, getRecipeInformation, getRecipesByIngredients } from '../services/mealdb';

interface PantryItem { id: string; name: string; }

export default function EngineScreen() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });

  const [currentInput, setCurrentInput] = useState('');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [apiRecipes, setApiRecipes] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else signInAnonymously(auth).catch(console.error);
    });
    return () => unsubscribeAuth();
  }, []);

useEffect(() => {
    let ignore = false;

    if (currentInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await getAutocompleteSuggestions(currentInput);
        if (!ignore && Array.isArray(data)) {
          setSuggestions(data);
        }
      } catch (error) { 
        console.error(error); 
      }
    }, 500);

    return () => {
      ignore = true;
      clearTimeout(delayDebounceFn);
    };
  }, [currentInput]);

  useEffect(() => {
    if (!userId) return;
    const pantryQuery = query(collection(db, 'users', userId, 'pantry'), orderBy('createdAt', 'desc'));
    const unsubscribeDB = onSnapshot(pantryQuery, (snapshot) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPantryItems(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return () => unsubscribeDB();
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const handleSaveItem = async (exactName?: string) => {
    Keyboard.dismiss();
    const rawInput = (exactName || currentInput).trim().toLowerCase();
    if (rawInput === '' || !userId) return;

    if (pantryItems.some(item => item.name === rawInput) && !editingId) {
      Toast.show({ type: 'info', text1: 'Already in pantry!', text2: 'You already have this ingredient.' });
      setCurrentInput(''); setSuggestions([]); return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', userId, 'pantry', editingId), { name: rawInput });
        setEditingId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await addDoc(collection(db, 'users', userId, 'pantry'), { name: rawInput, createdAt: Date.now() });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setCurrentInput(''); setSuggestions([]);
    } catch (error) {
       Toast.show({ type: 'error', text1: 'Database Error', text2: 'Could not save ingredient.' });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'pantry', id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClearPantry = () => {
    if (!userId || pantryItems.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsClearModalVisible(true);
  };

  const executeClearPantry = async () => {
    setIsClearModalVisible(false); 
    if (!userId) return;
    try {
      await Promise.all(pantryItems.map(item => deleteDoc(doc(db, 'users', userId, 'pantry', item.id))));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Pantry Cleared', text2: 'Ready for a fresh start!' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to clear pantry.' });
    }
  };
  
  const triggerEdit = (item: PantryItem) => { 
    setCurrentInput(item.name); 
    setEditingId(item.id); 
    Haptics.selectionAsync(); 
  };

  const searchRecipes = async () => {
    if (pantryItems.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Toast.show({ type: 'error', text1: 'Pantry is Empty', text2: 'Add some ingredients before searching!' });
    }
    
    setIsSearching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    try {
      const data = await getRecipesByIngredients(pantryItems.map(item => item.name));
      setApiRecipes(data);
      
      if (data.length === 0) {
        Toast.show({ type: 'info', text1: 'No Matches', text2: 'Try using a broader main ingredient!' });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) { 
      Toast.show({ type: 'error', text1: 'API Error', text2: 'Failed to fetch recipes.' }); 
    } finally { 
      setIsSearching(false); 
    }
  };

  const fetchRecipeDetails = async (recipeId: number | string) => {
    setIsFetchingDetails(true);
    setModalVisible(true);
    Haptics.selectionAsync();
    try {
      const data = await getRecipeInformation(recipeId.toString());
      setSelectedRecipe(data);
    } catch (error) { 
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load recipe details.' }); 
      setModalVisible(false); 
    } finally { 
      setIsFetchingDetails(false); 
    }
  };

  if (!userId || !fontsLoaded) {
    return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.subtitle}>What's in your kitchen?</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <View style={styles.floatingInputBox}>
          <TextInput 
            style={styles.seamlessInput} 
            placeholder="Type an ingredient..." 
            placeholderTextColor="#A0A0A0"
            value={currentInput} 
            onChangeText={setCurrentInput} 
            onSubmitEditing={() => handleSaveItem()} 
            returnKeyType="done"
          />
          <TouchableOpacity 
            style={[styles.premiumAddButton, { backgroundColor: editingId ? COLORS.warning : COLORS.secondary }]} 
            onPress={() => handleSaveItem()}
          >
            <Text style={styles.btnText}>{editingId ? 'UPDATE' : 'ADD'}</Text>
          </TouchableOpacity>
        </View>
        
        {suggestions.length > 0 && (
          <View style={styles.floatingDropdown}>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => handleSaveItem(s.name)}>
                <Text style={styles.suggestionText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.pantryHeaderRow}>
        <Text style={styles.pantryHeaderText}>Your Ingredients ({pantryItems.length})</Text>
        {pantryItems.length > 0 && (
          <TouchableOpacity onPress={handleClearPantry} style={styles.clearBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pantryTagContainer}>
        {pantryItems.map((item) => (
          <View key={item.id} style={styles.floatingTag}>
            <Text style={styles.pantryTagText}>{item.name}</Text>
            {/* REPLACED EMOJIS WITH FEATHER ICONS */}
            <TouchableOpacity onPress={() => triggerEdit(item)} style={styles.tagIcon}>
              <Feather name="edit-2" size={14} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={[styles.tagIcon, { marginLeft: 4 }]}>
              <Feather name="x" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Pressable 
        style={({ pressed }) => [
          styles.floatingSearchButton,
          pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 } 
        ]} 
        onPress={searchRecipes} 
        disabled={isSearching}
      >
        {isSearching ? (
          <ActivityIndicator color="#fff" /> 
        ) : (
          <View style={styles.searchBtnContent}>
            {/* REPLACED EMOJI WITH IONICON */}
            <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.searchBtnText}>Find Recipes</Text>
          </View>
        )}
      </Pressable>

      <FlatList
        data={apiRecipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RecipeCard item={item} pantryItems={pantryItems} onPress={() => fetchRecipeDetails(item.id)} />}
        ListEmptyComponent={<EmptyState />} 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" 
        keyboardDismissMode="on-drag"
      />

      <RecipeModal 
        visible={modalVisible} 
        recipe={selectedRecipe} 
        isFetching={isFetchingDetails} 
        pantryItems={pantryItems} 
        onClose={() => { setModalVisible(false); setSelectedRecipe(null); }} 
      />

      <Modal visible={isClearModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Clear Pantry?</Text>
            <Text style={styles.confirmText}>Are you sure you want to delete all ingredients? This cannot be undone.</Text>
            
            <View style={styles.confirmButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsClearModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={executeClearPantry}>
                <Text style={styles.dangerBtnText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#F8F9FA', maxWidth: 600, width: '100%', alignSelf: 'center' },
  headerContainer: { marginBottom: 25, alignItems: 'center', marginTop: 10 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 32, color: '#1A1A1A', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#666', marginTop: 4, textAlign: 'center' },
  
  inputContainer: { zIndex: 10, marginBottom: 25 }, 
  floatingInputBox: { 
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 6,
    // SOFT SHADOW UPGRADE
    shadowColor: '#171717', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 
  },
  seamlessInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, paddingHorizontal: 15, color: '#1A1A1A' },
  premiumAddButton: { paddingHorizontal: 24, paddingVertical: 12, justifyContent: 'center', borderRadius: 12 },
  btnText: { fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 15 },
  
  floatingDropdown: { 
    backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: 8, 
    shadowColor: '#171717', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 
  },
  suggestionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#1A1A1A' },
  
  pantryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  pantryHeaderText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#1A1A1A' },
  clearBtn: { backgroundColor: '#FFEDED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearAllText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FF4D4D' },
  
  pantryTagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, zIndex: 1 },
  floatingTag: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#E5E7EB', // SOFTER BACKGROUND, NO BORDER
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, marginBottom: 10,
  },
  pantryTagText: { fontFamily: 'Inter_600SemiBold', color: '#1F2937', fontSize: 14, marginRight: 8 },
  tagIcon: { paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
  
  floatingSearchButton: { 
    backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 25,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 
  },
  searchBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { 
    backgroundColor: COLORS.surface || '#FFF', borderRadius: 16, padding: 25, width: '100%', maxWidth: 350, 
    shadowColor: '#171717', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 
  },
  confirmTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: COLORS.text || '#1A1A1A', marginBottom: 10 },
  confirmText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 25 },
  confirmButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F3F4F6' },
  dangerBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.danger || '#EF4444' },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', color: '#1F2937', fontSize: 15 },
  dangerBtnText: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 15 },
});