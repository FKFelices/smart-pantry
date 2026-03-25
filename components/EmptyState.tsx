// components/EmptyState.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🛒</Text>
      <Text style={styles.title}>Your pantry is empty!</Text>
      <Text style={styles.subtitle}>
        Type an ingredient above like "chicken" or "garlic" to start building your digital kitchen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed' },
  emoji: { fontSize: 60, marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
});