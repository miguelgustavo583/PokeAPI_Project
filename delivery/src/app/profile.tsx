import { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Dimensions, Animated, StatusBar, ActivityIndicator,
} from 'react-native';
import { Link, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React from 'react';

const { width } = Dimensions.get('window');

const BASE = 'https://lnh1dhp1mj.execute-api.us-east-1.amazonaws.com/api-pokemon';

type TeamPokemon = { index: string; name: string; image: string; type?: string };

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
    return                  { label: 'Iniciante',        color: '#90A4AE', icon: '🌱' };
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

const BADGES_DATA = [
    { icon: '🪨', name: 'Pedra'     },
    { icon: '💧', name: 'Cascata'   },
    { icon: '⚡', name: 'Trovão'    },
    { icon: '🌈', name: 'Arco-íris' },
    { icon: '🌿', name: 'Pântano'   },
    { icon: '👻', name: 'Alma'      },
    { icon: '🔥', name: 'Vulcão'    },
    { icon: '🌎', name: 'Terra'     },
];

const Badge = ({ icon, name, earned }: { icon: string; name: string; earned: boolean }) => (
    <View style={[bgd.wrap, !earned && { opacity: 0.25 }]}>
        <View style={[bgd.circle, earned && { borderColor: '#FFD700', backgroundColor: '#1a1500' }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <Text style={bgd.name}>{name}</Text>
    </View>
);
const bgd = StyleSheet.create({
    wrap:   { alignItems: 'center', width: (width - 72) / 4 },
    circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#1a2235', backgroundColor: '#080d14', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    name:   { color: '#3a5068', fontSize: 9, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
});

const PokemonCard = ({ pokemon }: { pokemon: TeamPokemon }) => {
    const image = pokemon.image?.includes('sprites/master/sprites/pokemon/')
        ? pokemon.image.replace('sprites/master/sprites/pokemon/', 'sprites/master/sprites/pokemon/other/official-artwork/')
        : pokemon.image;

    const color = '#EF5350';

    return (
        <View style={[pk.wrap, { borderColor: color + '44', backgroundColor: color + '10' }]}>
            <Image source={{ uri: image }} style={pk.img} resizeMode="contain" />
            <Text style={[pk.name, { color: '#e8f0fe' }]} numberOfLines={1}>{pokemon.name}</Text>
            <Text style={pk.index}>#{pokemon.index}</Text>
        </View>
    );
};
const pk = StyleSheet.create({
    wrap:  { width: (width - 72) / 3, borderRadius: 14, borderWidth: 1.5, padding: 10, alignItems: 'center' },
    img:   { width: 72, height: 72 },
    name:  { fontSize: 9, fontWeight: '800', textTransform: 'capitalize', textAlign: 'center', marginTop: 4, marginBottom: 2 },
    index: { color: '#3a5068', fontSize: 8, fontWeight: '600' },
});

export default function Profile() {
    const [username,     setUsername]     = useState('');
    const [wins,         setWins]         = useState(0);
    const [losses,       setLosses]       = useState(0);
    const [teamPokemons, setTeamPokemons] = useState<TeamPokemon[]>([]);
    const [loading,      setLoading]      = useState(true);
    const navigation = useNavigation();

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const loadProfile = async () => {
        try {
            const raw = await AsyncStorage.getItem('@pokemon_user');
            if (!raw) { setLoading(false); return; }

            const user   = JSON.parse(raw);
            const userId = user.id ?? user.userId ?? user.user_id;
            setUsername(user.username ?? user.name ?? '');

            try {
                const { data: stats } = await axios.get(`${BASE}/auth/v1/stats/${userId}`);
                setWins(Number(stats.vitorias   ?? stats.wins   ?? stats.Vitorias ?? 0));
                setLosses(Number(stats.derrotas ?? stats.losses ?? stats.Derrotas ?? 0));
            } catch { }

            try {
                const { data } = await axios.get(`${BASE}/pokemon/v1/team`, {
                    params: { 'user-id': userId },
                });

                const teamArray: TeamPokemon[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.team)
                        ? data.team
                        : [];

                setTeamPokemons(teamArray.filter(p => p && p.name));
            } catch (e) {
                console.log('Erro time no perfil:', e);
            }
        } catch (err) {
            console.log('Erro profile:', err);
        } finally {
            setLoading(false);
        }
    };

    // Recarrega os dados globais e o time no perfil sempre que a página ganhar foco
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadProfile();
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        });
        return unsubscribe;
    }, [navigation]);

    const total        = wins + losses;
    const winRate      = total > 0 ? Math.round((wins / total) * 100) : 0;
    const rank         = getRank(wins);
    const earnedBadges = Math.min(Math.floor(wins / 5), 8);

    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgGlow} /><View style={s.bgCircle} />

            <View style={s.header}>
                <Link href="/dashboard" asChild>
                    <TouchableOpacity style={s.backBtn}><Text style={s.backText}>← Pokédex</Text></TouchableOpacity>
                </Link>
                <Pokeball size={40} />
            </View>

            {loading ? (
                <View style={s.loadWrap}>
                    <ActivityIndicator size="large" color="#EF5350" />
                    <Text style={s.loadText}>Carregando perfil...</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <View style={s.heroSection}>
                            <View style={s.avatarWrap}>
                                <View style={s.avatarFallback}>
                                    <Text style={s.avatarInitial}>{username.charAt(0).toUpperCase()}</Text>
                                </View>
                            </View>
                            <Text style={s.trainerLabel}>TREINADOR</Text>
                            <Text style={s.trainerName}>{username}</Text>
                            <View style={[s.rankBadge, { borderColor: rank.color + '55', backgroundColor: rank.color + '15' }]}>
                                <Text style={{ fontSize: 14, marginRight: 6 }}>{rank.icon}</Text>
                                <Text style={[s.rankText, { color: rank.color }]}>{rank.label}</Text>
                            </View>
                        </View>

                        <View style={s.wdRow}>
                            <View style={[s.wdCard, { borderColor: '#66BB6A55', backgroundColor: '#66BB6A12' }]}>
                                <Text style={s.wdIcon}>🏆</Text>
                                <Text style={[s.wdValue, { color: '#66BB6A' }]}>{wins}</Text>
                                <Text style={s.wdLabel}>VITÓRIAS</Text>
                            </View>
                            <View style={s.wdDivider} />
                            <View style={[s.wdCard, { borderColor: '#EF535055', backgroundColor: '#EF535012' }]}>
                                <Text style={s.wdIcon}>💀</Text>
                                <Text style={[s.wdValue, { color: '#EF5350' }]}>{losses}</Text>
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
                            <StatLine label="Vitórias"  value={wins}    max={100} color="#66BB6A" />
                            <StatLine label="Derrotas"  value={losses}  max={100} color="#EF5350" />
                            <StatLine label="Win Rate"  value={winRate} max={100} color="#FFD54F" />
                            <StatLine label="Batalhas"  value={total}   max={150} color="#4FC3F7" />
                        </View>

                        <Text style={s.sectionLabel}>MEU TIME  ·  {teamPokemons.length} POKÉMON</Text>
                        {teamPokemons.length > 0 ? (
                            <View style={s.teamGrid}>
                                {teamPokemons.map((p, i) => <PokemonCard key={i} pokemon={p} />)}
                            </View>
                        ) : (
                            <View style={s.emptyTeam}>
                                <Text style={s.emptyTeamText}>Nenhum Pokémon no time ainda.</Text>
                            </View>
                        )}

                        <Text style={s.sectionLabel}>INSÍGNIAS DE GINÁSIO</Text>
                        <View style={s.card}>
                            <View style={s.badgesGrid}>
                                {BADGES_DATA.map((b, i) => (
                                    <Badge key={b.name} icon={b.icon} name={b.name} earned={i < earnedBadges} />
                                ))}
                            </View>
                            <Text style={s.badgesProgressText}>{earnedBadges} / {BADGES_DATA.length} insígnias conquistadas</Text>
                            <View style={s.badgesTrack}>
                                <View style={[s.badgesFill, { width: `${(earnedBadges / BADGES_DATA.length) * 100}%` }]} />
                            </View>
                        </View>

                        <Text style={s.sectionLabel}>ESTATÍSTICAS</Text>
                        <View style={s.statsGrid}>
                            {[
                                { icon: '🎮', label: 'Batalhas',  value: total               },
                                { icon: '📦', label: 'Pokémon',   value: teamPokemons.length  },
                                { icon: '🌍', label: 'Regiões',   value: 1                   },
                                { icon: '🏅', label: 'Insígnias', value: earnedBadges         },
                            ].map(item => (
                                <View key={item.label} style={s.statCard}>
                                    <Text style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</Text>
                                    <Text style={s.statValue}>{item.value}</Text>
                                    <Text style={s.statLabel}>{item.label}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={{ height: 48 }} />
                    </Animated.View>
                </ScrollView>
            )}
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
    loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadText: { color: '#3a5068', fontSize: 13, letterSpacing: 1 },
    heroSection:   { alignItems: 'center', paddingTop: 12, paddingBottom: 24 },
    avatarWrap:    { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#EF5350', overflow: 'hidden', marginBottom: 8, shadowColor: '#EF5350', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
    avatarFallback:{ flex: 1, backgroundColor: '#0f1420', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: '#EF5350', fontSize: 44, fontWeight: '900' },
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
    teamGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
    emptyTeam:     { backgroundColor: '#080d14', borderRadius: 16, borderWidth: 0.5, borderColor: '#0f1e2e', padding: 24, alignItems: 'center' },
    emptyTeamText: { color: '#3a5068', fontSize: 13, fontWeight: '700' },
    statsGrid: { flexDirection: 'row', gap: 10 },
    statCard:  { flex: 1, backgroundColor: '#080d14', borderRadius: 14, borderWidth: 0.5, borderColor: '#0f1e2e', alignItems: 'center', paddingVertical: 16 },
    statValue: { color: '#e8f0fe', fontSize: 18, fontWeight: '900', marginBottom: 3 },
    statLabel: { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});