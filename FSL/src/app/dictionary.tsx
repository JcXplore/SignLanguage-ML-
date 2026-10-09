import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import {
  ALL_ASL_SIGNS,
  ASLSign,
} from '@/data/aslDictionary';
import { SpeechService } from '@/services/speechService';

export default function DictionaryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'alphabet' | 'numbers' | 'common' | 'emergency'
  >('all');

  const categories = [
    { id: 'all', label: 'All Signs' },
    { id: 'alphabet', label: 'Letters (A-Z)' },
    { id: 'numbers', label: 'Numbers (0-9)' },
    { id: 'common', label: 'Daily Words' },
    { id: 'emergency', label: 'Emergency' },
  ] as const;

  const filteredSigns = useMemo(() => {
    return ALL_ASL_SIGNS.filter((sign) => {
      const matchesCategory =
        selectedCategory === 'all' || sign.category === selectedCategory;
      const matchesSearch =
        sign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sign.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sign.handshape.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleSpeakSign = (sign: ASLSign) => {
    SpeechService.speak(sign.name);
  };

  const getCategoryColor = (category: ASLSign['category']) => {
    switch (category) {
      case 'emergency':
        return colors.danger;
      case 'common':
        return colors.success;
      case 'numbers':
        return colors.warning;
      case 'alphabet':
      default:
        return colors.primary;
    }
  };

  const renderSignCard = ({ item }: { item: ASLSign }) => {
    const badgeColor = getCategoryColor(item.category);

    return (
      <View
        style={[
          styles.signCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.largeBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.largeBadgeText}>
                {item.symbol || item.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.signName, { color: colors.text }]}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.categoryTag,
                  { backgroundColor: `${badgeColor}20` },
                ]}>
                <Text style={[styles.categoryTagText, { color: badgeColor }]}>
                  {item.category.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.speakIconBtn, { backgroundColor: colors.backgroundSelected }]}
            onPress={() => handleSpeakSign(item)}
            accessibilityLabel={`Speak ${item.name}`}>
            <Ionicons name="volume-medium-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Description & Guide */}
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="hand-right-outline" size={16} color={badgeColor} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              <Text style={styles.boldLabel}>Handshape: </Text>
              {item.handshape}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              <Text style={styles.boldLabel}>How to Form: </Text>
              {item.description}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              <Text style={styles.boldLabel}>Movement: </Text>
              {item.movement}
            </Text>
          </View>

          {item.tips && (
            <View
              style={[
                styles.tipBox,
                { backgroundColor: colors.backgroundSelected },
              ]}>
              <Ionicons name="bulb-outline" size={14} color={colors.warning} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                {item.tips}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            ASL Dictionary
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Offline guide for signs, fingerspelling & numbers
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.cardBorder,
          },
        ]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search signs, handshapes, letters..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.backgroundElement,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedCategory(item.id)}>
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Signs List */}
      <FlatList
        data={filteredSigns}
        keyExtractor={(item) => item.id}
        renderItem={renderSignCard}
        contentContainerStyle={styles.signsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No signs found
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try searching for another letter or word
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoriesWrapper: {
    marginBottom: 6,
  },
  categoryList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
  },
  signsList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
    paddingBottom: 40,
  },
  signCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  largeBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeBadgeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  titleContainer: {
    gap: 3,
  },
  signName: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  speakIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  boldLabel: {
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  tipText: {
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
  },
});
