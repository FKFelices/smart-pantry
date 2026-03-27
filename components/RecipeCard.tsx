import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { checkIngredientMatch } from '../utils/matchingEngine';

interface RecipeCardProps {
  item: any;
  pantryItems: { name: string }[]; // <-- NEW PROP
  onPress: () => void;
}

export default function RecipeCard({ item, pantryItems, onPress }: RecipeCardProps) {
  // 1. Combine all ingredients the API returned
  const allIngredients = [
    ...(item.usedIngredients || []), 
    ...(item.missedIngredients || [])
  ];

  // 2. Run them through our Smart Matcher instead of trusting the API
  const customHave = allIngredients.filter(ing => checkIngredientMatch(pantryItems, ing.name));
  const customMissing = allIngredients.filter(ing => !checkIngredientMatch(pantryItems, ing.name));

  // 3. Recalculate the true match percentage based on SMART matching
  const totalIngredients = allIngredients.length;
  const matchPercentage = totalIngredients > 0 ? Math.round((customHave.length / totalIngredients) * 100) : 0;

  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress}>
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.percentage, { color: matchPercentage >= 80 ? COLORS.success : COLORS.warning }]}>
            {matchPercentage}% Match
          </Text>
        </View>
        
        {customHave.length > 0 && (
          <Text style={styles.details}>
            <Text style={styles.haveText}>Have: </Text>
            {customHave.map((i: any) => i.name).join(', ')}
          </Text>
        )}
        
        {customMissing.length > 0 && (
          <Text style={styles.details}>
            <Text style={styles.missedText}>Missing: </Text>
            {customMissing.map((i: any) => i.name).join(', ')}
          </Text>
        )}
        
        <Text style={styles.tapToView}>Tap to view full recipe 👆</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    marginBottom: 15, 
    overflow: 'hidden',
    borderWidth: 1, 
    borderColor: '#F0F0F0',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 12, 
    elevation: 3 
  },
  image: { width: '100%', height: 120, backgroundColor: COLORS.border },
  content: { padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, flex: 1, marginRight: 10 },
  percentage: { fontSize: 14, fontWeight: 'bold' },
  details: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  haveText: { fontWeight: 'bold', color: COLORS.success },
  missedText: { fontWeight: 'bold', color: COLORS.danger },
  tapToView: { fontSize: 12, color: COLORS.primary, marginTop: 10, fontWeight: 'bold', fontStyle: 'italic' },
});