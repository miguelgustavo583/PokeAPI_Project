import { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Animated, TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { register, randomPokemonIds, addCaptured } from '../integration/authIntegration';
import React from 'react';

const { width } = Dimensions.get('window');

// ─── Pokébola decorativa ──────────────────────────────────────────────────────
const Pokeball = ({ size = 64 }: { size?: number }) => (
    <View style={[pb.ball, {
        width: size, height: size, borderRadius: size / 2,
        shadowColor: '#EF5350', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
        marginBottom: 20, marginTop: 4,
    }]}>
        <View style={[pb.top,         { height: size * 0.4  }]} />
        <View style={[pb.stripe,      { height: size * 0.14 }]} />
        <View style={[pb.bottom,      { height: size * 0.4  }]} />
        <View style={[pb.center,      { width: size * 0.3,  height: size * 0.3,  borderRadius: size * 0.15, top: size * 0.35, left: size * 0.35 }]} />
        <View style={[pb.centerInner, { width: size * 0.14, height: size * 0.14, borderRadius: size * 0.07, top: size * 0.43, left: size * 0.43 }]} />
    </View>
);
const pb = StyleSheet.create({
    ball:        { overflow: 'hidden', borderWidth: 3, borderColor: '#1a1a2e' },
    top:         { backgroundColor: '#EF5350' },
    stripe:      { backgroundColor: '#1a1a2e' },
    bottom:      { backgroundColor: '#f5f5f0' },
    center:      { position: 'absolute', backgroundColor: '#1a1a2e' },
    centerInner: { position: 'absolute', backgroundColor: '#f5f5f0' },
});

// ─── Campo de formulário ──────────────────────────────────────────────────────
const Field = ({ label, icon, placeholder, value, onChangeText, secure = false }: {
    label: string; icon: string; placeholder: string;
    value: string; onChangeText: (t: string) => void; secure?: boolean;
}) => (
    <View style={f.group}>
        <Text style={f.label}>{icon}  {label}</Text>
        <TextInput
            style={f.input}
            placeholder={placeholder}
            placeholderTextColor="#243044"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secure}
            autoCapitalize="none"
        />
    </View>
);
const f = StyleSheet.create({
    group: { width: '100%', marginBottom: 4 },
    label: { color: '#3a5068', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
    input: {
        backgroundColor: '#070b14', borderWidth: 1, borderColor: '#1a2235',
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
        marginBottom: 14, fontSize: 15, color: '#e2e8f0', width: '100%',
    },
});

// ─── Indicador de força da senha ──────────────────────────────────────────────
const PasswordStrength = ({ password }: { password: string }) => {
    const len      = password.length;
    const hasNum   = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasSpec  = /[^a-zA-Z0-9]/.test(password);
    const score    = [len >= 6, len >= 10, hasNum, hasUpper, hasSpec].filter(Boolean).length;
    const labels   = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];
    const colors   = ['#0f1820', '#EF5350', '#FF9800', '#FFD54F', '#66BB6A', '#4FC3F7'];
    if (!password) return null;
    return (
        <View style={ps.wrap}>
            <View style={ps.bars}>
                {[1,2,3,4,5].map(i => (
                    <View key={i} style={[ps.bar, { backgroundColor: i <= score ? colors[score] : '#0f1820' }]} />
                ))}
            </View>
            <Text style={[ps.label, { color: colors[score] }]}>{labels[score]}</Text>
        </View>
    );
};
const ps = StyleSheet.create({
    wrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -10, marginBottom: 14, width: '100%' },
    bars:  { flexDirection: 'row', gap: 4, flex: 1 },
    bar:   { flex: 1, height: 3, borderRadius: 99 },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, width: 62, textAlign: 'right' },
});

// ─── REGISTER SCREEN ──────────────────────────────────────────────────────────
export default function Register() {
    const router = useRouter();

    const [nome,      setNome]      = useState('');
    const [senha,     setSenha]     = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [error,     setError]     = useState('');
    const [loading,   setLoading]   = useState(false);
    const [step,      setStep]      = useState<'form' | 'loading_pokemon' | 'success'>('form');
    const [pokemonsAssigned, setPokemonsAssigned] = useState<number[]>([]);

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const pokeAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleRegister = async () => {
        setError('');

        // Validações
        if (!nome.trim())            return setError('Escolha um nome de treinador.');
        if (nome.trim().length < 3)  return setError('Nome muito curto. Mínimo 3 caracteres.');
        if (senha.length < 6)        return setError('Senha muito curta. Mínimo 6 caracteres.');
        if (senha !== confirmar)      return setError('As senhas não coincidem.');

        try {
            setLoading(true);

            // 1. Registra o usuário na API
            const user = await register(nome.trim(), senha);
            const userId = user.id ?? user.userId ?? user.user_id;

            // 2. Sorteia 5 Pokémon aleatórios (IDs 1-151)
            setStep('loading_pokemon');
            const ids = randomPokemonIds();
            setPokemonsAssigned(ids);

            // 3. Adiciona cada um na API como capturado
            await Promise.all(ids.map(id => addCaptured(userId, id)));

            // 4. Animação de sucesso
            Animated.timing(pokeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
            setStep('success');

        } catch (err: any) {
            const msg = err?.response?.data?.message
                ?? err?.response?.data?.error
                ?? 'Erro ao criar conta. Tente outro nome de treinador.';
            setError(msg);
            setStep('form');
        } finally {
            setLoading(false);
        }
    };

    // ── Tela de sucesso ───────────────────────────────────────────────────────
    if (step === 'success') return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgGlow} />

            <Animated.View style={[s.successWrap, { opacity: pokeAnim }]}>
                <Text style={s.successEmoji}>🎉</Text>
                <Text style={s.successTitle}>Conta criada!</Text>
                <Text style={s.successSub}>Bem-vindo, <Text style={{ color: '#EF5350' }}>{nome}</Text>!</Text>

                <View style={s.successCard}>
                    <Text style={s.successCardLabel}>🎲  5 POKÉMON ATRIBUÍDOS À SUA CONTA</Text>
                    <View style={s.pokeBalls}>
                        {pokemonsAssigned.map((id, i) => (
                            <View key={i} style={s.pokeBallWrap}>
                                {/* Pokébola mini */}
                                <View style={s.miniBall}>
                                    <View style={s.miniTop}    />
                                    <View style={s.miniStripe} />
                                    <View style={s.miniBottom} />
                                    <View style={s.miniCenter} />
                                </View>
                                <Text style={s.pokeId}>#{String(id).padStart(3, '0')}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={s.successHint}>Faça login para descobrir quem são!</Text>
                </View>

                <Link href="/" asChild>
                    <TouchableOpacity style={s.successBtn}>
                        <Text style={s.successBtnText}>IR PARA O LOGIN  →</Text>
                    </TouchableOpacity>
                </Link>
            </Animated.View>
        </View>
    );

    // ── Tela de carregando pokémon ────────────────────────────────────────────
    if (step === 'loading_pokemon') return (
        <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', gap: 20 }]}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgGlow} />
            <ActivityIndicator size="large" color="#EF5350" />
            <Text style={s.loadingTitle}>Sorteando seus Pokémon...</Text>
            <Text style={s.loadingSubtitle}>Preparando sua aventura</Text>
        </View>
    );

    // ── Formulário ────────────────────────────────────────────────────────────
    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgGlow} />
            <View style={s.bgCircle} />

            <View style={s.header}>
                <Link href="/" asChild>
                    <TouchableOpacity style={s.backBtn}>
                        <Text style={s.backText}>← Login</Text>
                    </TouchableOpacity>
                </Link>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
                <Animated.View style={[s.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                    {/* Faixa topo */}
                    <View style={s.topStripe}>
                        <View style={s.stripeRed}   />
                        <View style={s.stripeBlack} />
                        <View style={s.stripeWhite} />
                    </View>

                    <View style={s.card}>
                        <Pokeball size={64} />

                        <Text style={s.eyebrow}>PROFESSOR OAK</Text>
                        <Text style={s.title}>Criar Conta</Text>
                        <Text style={s.subtitle}>Registre-se e receba 5 Pokémon aleatórios!</Text>

                        <View style={s.divider} />

                        <Field label="TREINADOR"      icon="🎮" placeholder="Seu nome de treinador"  value={nome}      onChangeText={setNome}      />
                        <Field label="SENHA"          icon="🔑" placeholder="Mínimo 6 caracteres"    value={senha}     onChangeText={setSenha}     secure />
                        <PasswordStrength password={senha} />
                        <Field label="CONFIRMAR SENHA" icon="🔒" placeholder="Repita sua senha"      value={confirmar} onChangeText={setConfirmar} secure />

                        {error !== '' && (
                            <View style={s.errorBox}>
                                <Text style={s.errorIcon}>⚠</Text>
                                <Text style={s.errorText}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={handleRegister}
                            style={[s.btn, loading && { opacity: 0.7 }]}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={s.btnText}>CRIAR CONTA  →</Text>
                            }
                        </TouchableOpacity>

                        <Link href="/" asChild>
                            <TouchableOpacity style={s.loginBtn}>
                                <Text style={s.loginText}>Já tem conta?  </Text>
                                <Text style={s.loginLink}>Fazer login →</Text>
                            </TouchableOpacity>
                        </Link>

                        <Text style={s.footer}>Pokédex · Geração I · 151 Pokémon</Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const RED    = '#EF5350';
const CARD   = '#0f1420';
const BORDER = '#1a2235';

const s = StyleSheet.create({
    screen:   { flex: 1, backgroundColor: '#0a0e1a' },
    bgGlow:   { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: '#1a0505', opacity: 0.5 },
    bgCircle: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#EF535012', top: -60, right: -40 },

    header:   { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 4 },
    backBtn:  { padding: 8 },
    backText: { color: '#e8f0fe', fontSize: 14, fontWeight: '700' },

    scroll: { paddingVertical: 12, alignItems: 'center', paddingBottom: 40 },

    wrapper: {
        width: width * 0.88, maxWidth: 400, borderRadius: 20, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.6, shadowRadius: 24, elevation: 18,
    },
    topStripe:   { flexDirection: 'row', height: 5 },
    stripeRed:   { flex: 2, backgroundColor: RED },
    stripeBlack: { flex: 0.3, backgroundColor: '#1a1a2e' },
    stripeWhite: { flex: 2, backgroundColor: '#f5f5f0' },

    card: {
        backgroundColor: CARD, padding: 28, alignItems: 'center',
        borderWidth: 1, borderTopWidth: 0, borderColor: BORDER,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    },

    eyebrow:  { color: RED, fontSize: 9, fontWeight: '700', letterSpacing: 3.5, marginBottom: 6 },
    title:    { color: '#f1f5f9', fontSize: 22, fontWeight: '900', marginBottom: 4, letterSpacing: -0.3 },
    subtitle: { color: '#3a5068', fontSize: 12, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
    divider:  { width: '100%', height: 0.5, backgroundColor: BORDER, marginBottom: 20, marginTop: 4 },

    errorBox: {
        width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#2d0a0a', borderRadius: 8, borderWidth: 1,
        borderColor: '#5a1a1a', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    },
    errorIcon: { fontSize: 14 },
    errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', flex: 1 },

    btn: {
        backgroundColor: RED, borderRadius: 10, paddingVertical: 14,
        alignItems: 'center', width: '100%',
        borderWidth: 1, borderColor: '#ff867c40', marginTop: 4,
    },
    btnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },

    loginBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, marginTop: 12 },
    loginText: { color: '#3a5068', fontSize: 13 },
    loginLink: { color: RED, fontSize: 13, fontWeight: '700' },
    footer:    { color: '#1e3050', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 16 },

    // Loading
    loadingTitle:    { color: '#e8f0fe', fontSize: 18, fontWeight: '800' },
    loadingSubtitle: { color: '#3a5068', fontSize: 13 },

    // Success
    successWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 8 },
    successEmoji:     { fontSize: 56, marginBottom: 4 },
    successTitle:     { color: '#e8f0fe', fontSize: 26, fontWeight: '900' },
    successSub:       { color: '#3a5068', fontSize: 14, marginBottom: 16 },

    successCard: {
        backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
        padding: 20, width: '100%', alignItems: 'center', gap: 16,
    },
    successCardLabel: { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 2 },

    pokeBalls:   { flexDirection: 'row', gap: 12, justifyContent: 'center' },
    pokeBallWrap:{ alignItems: 'center', gap: 6 },

    // Mini pokébola na tela de sucesso
    miniBall:   { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2.5, borderColor: '#1a1a2e', shadowColor: '#EF5350', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 6 },
    miniTop:    { height: 16, backgroundColor: RED },
    miniStripe: { height: 6,  backgroundColor: '#1a1a2e' },
    miniBottom: { height: 16, backgroundColor: '#f5f5f0' },
    miniCenter: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#1a1a2e', top: 16, left: 16 },

    pokeId:      { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    successHint: { color: '#1e3050', fontSize: 11, fontStyle: 'italic' },

    successBtn:     { backgroundColor: RED, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
    successBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
});