import { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Dimensions, Animated, StatusBar, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import React from 'react';

const { width } = Dimensions.get('window');

// ─── Pokébola decorativa ──────────────────────────────────────────────────────
const Pokeball = ({ size = 36 }: { size?: number }) => (
    <View style={[pb.ball, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[pb.top,         { height: size * 0.38 }]} />
        <View style={[pb.stripe,      { height: size * 0.14 }]} />
        <View style={[pb.bottom,      { height: size * 0.38 }]} />
        <View style={[pb.center,      { width: size * 0.3,  height: size * 0.3,  borderRadius: size * 0.15, top: size * 0.35, left: size * 0.35 }]} />
        <View style={[pb.centerInner, { width: size * 0.14, height: size * 0.14, borderRadius: size * 0.07, top: size * 0.43, left: size * 0.43 }]} />
    </View>
);
const pb = StyleSheet.create({
    ball:        { overflow: 'hidden', borderWidth: 2.5, borderColor: '#1a1a2e' },
    top:         { backgroundColor: '#EF5350' },
    stripe:      { backgroundColor: '#1a1a2e' },
    bottom:      { backgroundColor: '#f5f5f0' },
    center:      { position: 'absolute', backgroundColor: '#1a1a2e' },
    centerInner: { position: 'absolute', backgroundColor: '#f5f5f0' },
});

const getRank = (wins: number) => {
    if (wins >= 100) return { label: 'Mestre Pokémon',   color: '#FFD700', icon: '👑' };
    if (wins >= 50)  return { label: 'Elite Four',       color: '#CE93D8', icon: '💜' };
    if (wins >= 20)  return { label: 'Líder de Ginásio', color: '#4FC3F7', icon: '🏅' };
    if (wins >= 5)   return { label: 'Treinador',        color: '#66BB6A', icon: '⭐' };
    return               { label: 'Iniciante',           color: '#90A4AE', icon: '🌱' };
};

const StatLine = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: Math.min(value / max, 1), duration: 1000, useNativeDriver: false }).start();
    }, [value]);
    const barW = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={sl.row}>
            <Text style={sl.label}>{label}</Text>
            <View style={sl.track}><Animated.View style={[sl.fill, { width: barW, backgroundColor: color }]} /></View>
            <Text style={[sl.value, { color }]}>{value}</Text>
        </View>
    );
};
const sl = StyleSheet.create({
    row:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    label: { color: '#3a5068', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, width: 70 },
    track: { flex: 1, height: 4, backgroundColor: '#0f1820', borderRadius: 99, overflow: 'hidden' },
    fill:  { height: 4, borderRadius: 99 },
    value: { fontSize: 13, fontWeight: '800', width: 28, textAlign: 'right' },
});

const Badge = ({ icon, name, earned }: { icon: string; name: string; earned: boolean }) => (
    <View style={[bg.wrap, !earned && { opacity: 0.25 }]}>
        <View style={[bg.circle, earned && { borderColor: '#FFD700', backgroundColor: '#1a1500' }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <Text style={bg.name}>{name}</Text>
    </View>
);
const bg = StyleSheet.create({
    wrap:   { alignItems: 'center', width: (width - 72) / 4 },
    circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#1a2235', backgroundColor: '#080d14', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    name:   { color: '#3a5068', fontSize: 9, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
});

const TRAINER_NAME = 'Neyma';
const WINS         = 47;
const LOSSES       = 12;
const BADGES_DATA  = [
    { icon: '🪨', name: 'Pedra',     earned: true  },
    { icon: '💧', name: 'Cascata',   earned: true  },
    { icon: '⚡', name: 'Trovão',    earned: true  },
    { icon: '🌈', name: 'Arco-íris', earned: true  },
    { icon: '🌿', name: 'Pântano',   earned: true  },
    { icon: '👻', name: 'Alma',      earned: false },
    { icon: '🔥', name: 'Vulcão',    earned: false },
    { icon: '🌎', name: 'Terra',     earned: false },
];

export default function Profile() {
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const total   = WINS + LOSSES;
    const winRate = total > 0 ? Math.round((WINS / total) * 100) : 0;
    const rank    = getRank(WINS);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    // Usa fetch de URL de imagem via prompt nativo
    const pickImage = () => {
        Alert.prompt(
            'Foto do Treinador',
            'Cole a URL da sua foto:',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Salvar',
                    onPress: (url) => {
                        if (url && url.trim() !== '') setPhotoUri(url.trim());
                    },
                },
            ],
            'plain-text',
            photoUri ?? ''
        );
    };

    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgGlow} />
            <View style={s.bgCircle} />

            <View style={s.header}>
                <Link href="/dashboard" asChild>
                    <TouchableOpacity style={s.backBtn}>
                        <Text style={s.backText}>← Pokédex</Text>
                    </TouchableOpacity>
                </Link>
                <Pokeball size={40} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
                <Animated.View style={{ opacity: fadeAnim }}>

                    <View style={s.heroSection}>
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.85} style={s.avatarWrap}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={s.avatarImg} onError={() => setPhotoUri(null)} />
                            ) : (
                                <View style={s.avatarFallback}>
                                    <Text style={s.avatarInitial}>{TRAINER_NAME.charAt(0).toUpperCase()}</Text>
                                </View>
                            )}
                            <View style={s.cameraOverlay}>
                                <Text style={s.cameraIcon}>📷</Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={s.picHint}>Toque para adicionar foto</Text>

                        <Text style={s.trainerLabel}>TREINADOR</Text>
                        <Text style={s.trainerName}>{TRAINER_NAME}</Text>

                        <View style={[s.rankBadge, { borderColor: rank.color + '55', backgroundColor: rank.color + '15' }]}>
                            <Text style={{ fontSize: 14, marginRight: 6 }}>{rank.icon}</Text>
                            <Text style={[s.rankText, { color: rank.color }]}>{rank.label}</Text>
                        </View>
                    </View>

                    <View style={s.wdRow}>
                        <View style={[s.wdCard, { borderColor: '#66BB6A55', backgroundColor: '#66BB6A12' }]}>
                            <Text style={s.wdIcon}>🏆</Text>
                            <Text style={[s.wdValue, { color: '#66BB6A' }]}>{WINS}</Text>
                            <Text style={s.wdLabel}>VITÓRIAS</Text>
                        </View>
                        <View style={s.wdDivider} />
                        <View style={[s.wdCard, { borderColor: '#EF535055', backgroundColor: '#EF535012' }]}>
                            <Text style={s.wdIcon}>💀</Text>
                            <Text style={[s.wdValue, { color: '#EF5350' }]}>{LOSSES}</Text>
                            <Text style={s.wdLabel}>DERROTAS</Text>
                        </View>
                        <View style={s.wdDivider} />
                        <View style={[s.wdCard, { borderColor: '#FFD54F55', backgroundColor: '#FFD54F12' }]}>
                            <Text style={s.wdIcon}>⚡</Text>
                            <Text style={[s.wdValue, { color: '#FFD54F' }]}>{winRate}%</Text>
                            <Text style={s.wdLabel}>WIN RATE</Text>
                        </View>
                    </View>

                    <Text style={s.sectionLabel}>DESEMPENHO</Text>
                    <View style={s.card}>
                        <StatLine label="Vitórias"  value={WINS}    max={100} color="#66BB6A" />
                        <StatLine label="Derrotas"  value={LOSSES}  max={100} color="#EF5350" />
                        <StatLine label="Win Rate"  value={winRate} max={100} color="#FFD54F" />
                        <StatLine label="Batalhas"  value={total}   max={150} color="#4FC3F7" />
                    </View>

                    <Text style={s.sectionLabel}>INSÍGNIAS DE GINÁSIO</Text>
                    <View style={s.card}>
                        <View style={s.badgesGrid}>
                            {BADGES_DATA.map(b => <Badge key={b.name} icon={b.icon} name={b.name} earned={b.earned} />)}
                        </View>
                        <Text style={s.badgesProgressText}>{BADGES_DATA.filter(b => b.earned).length} / {BADGES_DATA.length} insígnias conquistadas</Text>
                        <View style={s.badgesTrack}>
                            <View style={[s.badgesFill, { width: `${(BADGES_DATA.filter(b => b.earned).length / BADGES_DATA.length) * 100}%` }]} />
                        </View>
                    </View>

                    <Text style={s.sectionLabel}>ESTATÍSTICAS</Text>
                    <View style={s.statsGrid}>
                        {[
                            { icon: '🎮', label: 'Batalhas', value: total },
                            { icon: '📦', label: 'Pokémon',  value: 12   },
                            { icon: '🌍', label: 'Regiões',  value: 1    },
                            { icon: '⏱️', label: 'Horas',    value: 84   },
                        ].map(item => (
                            <View key={item.label} style={s.statCard}>
                                <Text style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</Text>
                                <Text style={s.statValue}>{item.value}</Text>
                                <Text style={s.statLabel}>{item.label}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={s.sectionLabel}>POKÉMON FAVORITO</Text>
                    <View style={[s.card, s.favCard]}>
                        <Image source={{ uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' }} style={s.favImg} resizeMode="contain" />
                        <View style={{ flex: 1 }}>
                            <Text style={s.favName}>Pikachu</Text>
                            <Text style={s.favSub}>#025  ·  Electric</Text>
                            <View style={s.favBadge}><Text style={s.favBadgeText}>⭐ Parceiro</Text></View>
                        </View>
                    </View>

                    <View style={{ height: 48 }} />
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen:   { flex: 1, backgroundColor: '#050810' },
    bgGlow:   { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: '#1a0505', opacity: 0.5 },
    bgCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#EF535010', top: -80, right: -60 },

    header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
    backBtn:  { padding: 8 },
    backText: { color: '#e8f0fe', fontSize: 14, fontWeight: '700' },
    scroll:   { paddingHorizontal: 20, paddingTop: 8 },

    heroSection:   { alignItems: 'center', paddingTop: 12, paddingBottom: 24 },
    avatarWrap:    { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#EF5350', overflow: 'hidden', marginBottom: 8, shadowColor: '#EF5350', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
    avatarImg:     { width: '100%', height: '100%' },
    avatarFallback:{ flex: 1, backgroundColor: '#0f1420', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: '#EF5350', fontSize: 44, fontWeight: '900' },
    cameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
    cameraIcon:    { fontSize: 14 },
    picHint:       { color: '#1e3050', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 16 },

    trainerLabel: { color: '#EF5350', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
    trainerName:  { color: '#e8f0fe', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 12 },
    rankBadge:    { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
    rankText:     { fontSize: 13, fontWeight: '700' },

    wdRow:     { flexDirection: 'row', backgroundColor: '#080d14', borderRadius: 16, borderWidth: 0.5, borderColor: '#0f1e2e', marginBottom: 8, overflow: 'hidden' },
    wdCard:    { flex: 1, alignItems: 'center', paddingVertical: 20 },
    wdDivider: { width: 0.5, backgroundColor: '#0f1e2e' },
    wdIcon:    { fontSize: 22, marginBottom: 6 },
    wdValue:   { fontSize: 26, fontWeight: '900', marginBottom: 2 },
    wdLabel:   { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

    sectionLabel:       { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginTop: 24, marginBottom: 12 },
    card:               { backgroundColor: '#080d14', borderRadius: 16, borderWidth: 0.5, borderColor: '#0f1e2e', padding: 16 },
    badgesGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
    badgesProgressText: { color: '#3a5068', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
    badgesTrack:        { height: 3, backgroundColor: '#0f1820', borderRadius: 99, overflow: 'hidden' },
    badgesFill:         { height: 3, backgroundColor: '#FFD700', borderRadius: 99 },

    statsGrid: { flexDirection: 'row', gap: 10 },
    statCard:  { flex: 1, backgroundColor: '#080d14', borderRadius: 14, borderWidth: 0.5, borderColor: '#0f1e2e', alignItems: 'center', paddingVertical: 16 },
    statValue: { color: '#e8f0fe', fontSize: 18, fontWeight: '900', marginBottom: 3 },
    statLabel: { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

    favCard:      { flexDirection: 'row', alignItems: 'center', gap: 16 },
    favImg:       { width: 80, height: 80 },
    favName:      { color: '#e8f0fe', fontSize: 18, fontWeight: '900', textTransform: 'capitalize', marginBottom: 4 },
    favSub:       { color: '#3a5068', fontSize: 12, letterSpacing: 0.5, marginBottom: 10 },
    favBadge:     { backgroundColor: '#FFD70015', borderRadius: 20, borderWidth: 1, borderColor: '#FFD70044', paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    favBadgeText: { color: '#FFD700', fontSize: 11, fontWeight: '700' },
});