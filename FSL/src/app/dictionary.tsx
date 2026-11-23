import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Radius, Type, FontFamily } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { ALL_ASL_SIGNS, ASLSign } from '@/data/aslDictionary';
import { SpeechService } from '@/services/speechService';
import { SignVisual } from '@/components/asl/SignVisual';
import { ScreenHeader } from '@/components/ScreenHeader';

type Filter = 'all' | ASLSign['category'];

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'alphabet', label: 'Letters' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'common', label: 'Everyday' },
  { id: 'emergency', label: 'Emergency' },
];

const CATEGORY_NAMES: Record<ASLSign['category'], string> = {
  alphabet: 'Letter',
  numbers: 'Number',
  common: 'Everyday word',
  emergency: 'Emergency',
};

const categoryColor = (category: ASLSign['category'], colors: Palette) =>
  category === 'emergency' ? colors.dangerText : colors.textSecondary;

export default function DictionaryScreen() {
  const { colors } = usePalette();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openSign, setOpenSign] = useState<ASLSign | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ASL_SIGNS.filter(
      (sign) =>
        (filter === 'all' || sign.category === filter) &&
        (!q ||
          sign.name.toLowerCase().includes(q) ||
          sign.description.toLowerCase().includes(q) ||
          sign.handshape.toLowerCase().includes(q))
    );
  }, [query, filter]);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Dictionary" />

      {/* The whole field shows focus, so the input's own browser outline is turned off. */}
      <View
        style={[
          styles.search,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: searchFocused ? colors.primaryText : 'transparent',
          },
        ]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search letters, numbers or words"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          accessibilityLabel="Search signs"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const selected = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filter,
                  { backgroundColor: selected ? colors.text : colors.backgroundElement },
                ]}
                onPress={() => setFilter(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Text
                  style={[Type.smallStrong, { color: selected ? colors.background : colors.text }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.row,
              { backgroundColor: colors.backgroundElement },
              index === 0 && styles.rowFirst,
              index === results.length - 1 && styles.rowLast,
              index > 0 && { borderTopColor: colors.cardBorder, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
            onPress={() => setOpenSign(item)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${CATEGORY_NAMES[item.category]}`}
            accessibilityHint="Opens how to sign it">
            <SignVisual sign={item} size={52} />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text style={[Type.bodyStrong, { color: colors.text }]}>{item.name}</Text>
                {item.category === 'emergency' && (
                  <Ionicons name="alert-circle" size={16} color={colors.dangerText} />
                )}
              </View>
              <Text style={[Type.small, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.handshape}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[Type.heading, { color: colors.text }]}>
              No signs match “{query.trim()}”
            </Text>
            <Text style={[Type.body, styles.centerText, { color: colors.textSecondary }]}>
              {filter === 'all'
                ? 'Check the spelling, or try a single letter.'
                : `Nothing in ${FILTERS.find((f) => f.id === filter)?.label}. Try searching all signs.`}
            </Text>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                setQuery('');
                setFilter('all');
              }}
              accessibilityRole="button">
              <Text style={[Type.smallStrong, { color: colors.primaryText }]}>Clear search</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <SignSheet sign={openSign} onClose={() => setOpenSign(null)} />
    </SafeAreaView>
  );
}

function SignSheet({ sign, onClose }: { sign: ASLSign | null; onClose: () => void }) {
  const { colors } = usePalette();

  return (
    <Modal
      visible={sign !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      {sign && (
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          <View style={styles.sheetBar}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Text style={[Type.bodyStrong, { color: colors.primaryText }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <View style={styles.sheetVisual}>
              <SignVisual sign={sign} size={200} showCaption />
            </View>
            <View style={styles.sheetTitleRow}>
              <View style={styles.flex}>
                <Text style={[Type.title, { color: colors.text }]} accessibilityRole="header">
                  {sign.name}
                </Text>
                <Text style={[Type.small, { color: categoryColor(sign.category, colors) }]}>
                  {CATEGORY_NAMES[sign.category]}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.speakBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => SpeechService.speak(sign.name)}
                accessibilityRole="button"
                accessibilityLabel={`Say ${sign.name} aloud`}>
                <Ionicons name="volume-high" size={22} color={colors.primaryText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.detailGroup, { backgroundColor: colors.backgroundElement }]}>
              <Detail label="Handshape" text={sign.handshape} />
              <Detail label="How to form it" text={sign.description} divider />
              <Detail label="Movement" text={sign.movement} divider />
            </View>

            {sign.tips ? (
              <View style={[styles.tip, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="bulb-outline" size={20} color={colors.primaryText} />
                <Text style={[Type.body, styles.flex, { color: colors.text }]}>{sign.tips}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

function Detail({ label, text, divider }: { label: string; text: string; divider?: boolean }) {
  const { colors } = usePalette();
  return (
    <View
      style={[
        styles.detail,
        divider && { borderTopColor: colors.cardBorder, borderTopWidth: StyleSheet.hairlineWidth },
      ]}>
      <Text style={[Type.meta, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[Type.body, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: Radius.control,
    borderWidth: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    height: '100%',
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  filters: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filter: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 72,
  },
  rowFirst: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
  },
  rowLast: {
    borderBottomLeftRadius: Radius.card,
    borderBottomRightRadius: Radius.card,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 10,
  },
  secondaryBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    marginTop: 6,
  },
  sheetBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  closeBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  sheetVisual: {
    alignItems: 'center',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speakBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailGroup: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  detail: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  tip: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: Radius.card,
  },
});
