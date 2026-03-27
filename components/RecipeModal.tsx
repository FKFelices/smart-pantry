import React from 'react';
import { ActivityIndicator, Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { checkIngredientMatch } from '../utils/matchingEngine';

interface RecipeModalProps {
  visible: boolean;
  recipe: any;
  isFetching: boolean;
  pantryItems: { name: string }[]; // <-- NEW PROP
  onClose: () => void;
}

export default function RecipeModal({ visible, recipe, isFetching, pantryItems, onClose }: RecipeModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {isFetching || !recipe ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching Chef's Secrets...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.floatingCloseBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕ Close</Text>
            </TouchableOpacity>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Image source={{ uri: recipe.image }} style={styles.heroImage} />
              
              <View style={styles.contentWrapper}>
                <Text style={[styles.title, { textAlign: 'center' }]}>{recipe.title}</Text>

                <View style={styles.floatingCard}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  {recipe.extendedIngredients?.map((ing: any, index: number) => {
                    // SMART MATCHER IN ACTION
                    const hasIt = checkIngredientMatch(pantryItems, ing.name || ing.original);
                    
                    return (
                      <View key={index} style={styles.ingredientRow}>
                        <Text style={[styles.bullet, { color: hasIt ? COLORS.success : '#D1D5DB' }]}>
                          {hasIt ? '✓' : '○'}
                        </Text>
                        <Text style={[styles.ingredient, { color: hasIt ? '#1A1A1A' : '#6B7280', fontFamily: hasIt ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                          {ing.original}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.floatingCard}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  <Text style={styles.instructionText}>
                    {recipe.instructions || "No detailed instructions provided by the chef."}
                  </Text>
                </View>

                {recipe.sourceUrl && (
                  <TouchableOpacity 
                    style={[styles.floatingSourceButton, recipe.sourceUrl.includes('youtube') && { backgroundColor: '#FF0000', shadowColor: '#FF0000' }]} 
                    onPress={() => Linking.openURL(recipe.sourceUrl)}
                  >
                    <Text style={styles.sourceButtonText}>
                      {recipe.sourceUrl.includes('youtube') ? '▶️ Watch Video Tutorial' : '🔗 Read Original Recipe'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{height: 60}} /> 
              </View>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Inter_600SemiBold', marginTop: 15, color: '#666', fontSize: 16 },
  body: { flex: 1 },
  
  floatingCloseBtn: { 
    position: 'absolute', top: 20, right: 20, zIndex: 100, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E5E5', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 
  },
  closeText: { fontFamily: 'Inter_700Bold', color: '#1A1A1A', fontSize: 14 },

  heroImage: { width: '100%', height: 320, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: '#E0E0E0' },
  contentWrapper: { padding: 30, marginTop: -10 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 15, lineHeight: 34 },
  
  metaBox: { flexDirection: 'row', marginBottom: 25, gap: 10 },
  metaPill: { 
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, 
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 
  },
  metaText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#444' },

  floatingCard: { 
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 
  },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A', marginBottom: 15 },
  
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, paddingRight: 10 },
  bullet: { fontFamily: 'Inter_700Bold', fontSize: 16, marginRight: 10, marginTop: 2 },
  ingredient: { fontSize: 16, lineHeight: 24, flex: 1 },
  instructionText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#444', lineHeight: 26 },

  floatingSourceButton: { 
    backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 
  },
  sourceButtonText: { fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 16 }
});