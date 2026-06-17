import { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions,
    TextInput, ActivityIndicator, Animated, StatusBar, Easing,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../integration/authIntegration';
import React from 'react';

const { width, height } = Dimensions.get('window');

// ─── Pokébola decorativa ──────────────────────────────────────────────────────
const Pokeball = () => (
    <View style={pb.ball}>
        <View style={pb.top} />
        <View style={pb.stripe} />
        <View style={pb.bottom} />
        <View style={pb.center} />
        <View style={pb.centerInner} />
    </View>
);
const pb = StyleSheet.create({
    ball: {
        width: 72, height: 72, borderRadius: 36,
        overflow: 'hidden', borderWidth: 3, borderColor: '#1a1a2e',
        marginBottom: 20, marginTop: 4,
        shadowColor: '#EF5350', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
    },
    top:         { width: 72, height: 30, backgroundColor: '#EF5350' },
    stripe:      { width: 72, height: 12, backgroundColor: '#1a1a2e' },
    bottom:      { width: 72, height: 30, backgroundColor: '#f5f5f0' },
    center:      { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#1a1a2e', top: 26, left: 26 },
    centerInner: { position: 'absolute', width: 10, height: 10, borderRadius: 5,  backgroundColor: '#f5f5f0', top: 31, left: 31 },
});

// ─── Pokébolas flutuantes de fundo ────────────────────────────────────────────
const BALLS = [
    { id: 1, x: '5%',  size: 40, duration: 7000, delay: 0    },
    { id: 2, x: '20%', size: 24, duration: 9000, delay: 800  },
    { id: 3, x: '40%', size: 52, duration: 6500, delay: 400  },
    { id: 4, x: '58%', size: 30, duration: 8500, delay: 1200 },
    { id: 5, x: '75%', size: 20, duration: 7500, delay: 200  },
    { id: 6, x: '88%', size: 44, duration: 9500, delay: 1600 },
    { id: 7, x: '30%', size: 18, duration: 8000, delay: 600  },
    { id: 8, x: '65%', size: 34, duration: 7200, delay: 1000 },
];

const FloatingBall = ({ x, size, duration, delay }: { x: string; size: number; duration: number; delay: number }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, []);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
    const opacity    = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.18, 0.18, 0] });
    const rotate     = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <Animated.View style={[
            fbs.ball,
            { left: x as any, width: size, height: size, borderRadius: size / 2 },
            { transform: [{ translateY }, { rotate }], opacity },
        ]}>
            <View style={[fbs.top,    { height: size * 0.38 }]} />
            <View style={[fbs.stripe, { height: size * 0.14 }]} />
            <View style={[fbs.bottom, { height: size * 0.38 }]} />
            <View style={[fbs.center, {
                width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
                top: size * 0.33, left: size * 0.36,
            }]} />
        </Animated.View>
    );
};
const fbs = StyleSheet.create({
    ball:   { position: 'absolute', bottom: 60, overflow: 'hidden', borderWidth: 1.5, borderColor: '#1a1a2e' },
    top:    { backgroundColor: '#EF5350' },
    stripe: { backgroundColor: '#1a1a2e' },
    bottom: { backgroundColor: '#f5f5f0' },
    center: { position: 'absolute', backgroundColor: '#1a1a2e' },
});

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
    const router = useRouter();
    const [trainer,  setTrainer]  = useState('');
    const [password, setPassword] = useState('');
    const [message,  setMessage]  = useState('');
    const [loading,  setLoading]  = useState(false);

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        setMessage('');
        if (!trainer.trim() || !password) return setMessage('Preencha todos os campos.');
        try {
            setLoading(true);
            const user   = await login(trainer.trim(), password);
            const userId = user.id ?? user.userId ?? user.user_id;
            await AsyncStorage.setItem('@pokemon_user', JSON.stringify({ id: userId, username: trainer.trim() }));
            router.push('/dashboard');
        } catch (err: any) {
            const msg = err?.response?.data?.message
                ?? err?.response?.data?.error
                ?? 'Treinador ou senha incorretos.';
            setMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />

            {/* Fundo */}
            <View style={s.bgBase} />
            <View style={s.bgGlow} />
            <View style={s.topBar} />
            <View style={s.bottomBar} />

            {/* Bolas flutuantes */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {BALLS.map(b => <FloatingBall key={b.id} x={b.x} size={b.size} duration={b.duration} delay={b.delay} />)}
            </View>

            {/* Card de login centralizado */}
            <Animated.View style={[s.cardWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                {/* Faixa topo pokébola */}
                <View style={s.topStripe}>
                    <View style={s.stripeRed} />
                    <View style={s.stripeBlack} />
                    <View style={s.stripeWhite} />
                </View>

                <View style={s.card}>
                    <Pokeball />

                    <Text style={s.eyebrow}>PROFESSOR OAK</Text>
                    <Text style={s.title}>Área do Treinador</Text>
                    <Text style={s.subtitle}>Identifique-se para acessar sua Pokédex</Text>

                    <View style={s.divider} />

                    {/* Campo treinador */}
                    <Text style={s.fieldLabel}>🎮  TREINADOR</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Nome do treinador"
                        placeholderTextColor="#243044"
                        value={trainer}
                        onChangeText={setTrainer}
                        autoCapitalize="none"
                    />

                    {/* Campo senha */}
                    <Text style={s.fieldLabel}>🔑  SENHA</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Senha secreta"
                        placeholderTextColor="#243044"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    {/* Erro */}
                    {message !== '' && (
                        <View style={s.errorBox}>
                            <Text style={s.errorIcon}>⚠</Text>
                            <Text style={s.errorText}>{message}</Text>
                        </View>
                    )}

                    {/* Botão login */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        style={[s.loginBtn, loading && { opacity: 0.7 }]}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={s.loginBtnText}>INICIAR JORNADA  →</Text>
                        }
                    </TouchableOpacity>

                    <View style={s.divider} />

                    {/* Link cadastro */}
                    <Link href="/register" asChild>
                        <TouchableOpacity style={s.registerBtn}>
                            <Text style={s.registerText}>Novo por aqui?  </Text>
                            <Text style={s.registerLink}>Criar conta →</Text>
                        </TouchableOpacity>
                    </Link>

                    <Text style={s.footer}>Pokédex · Geração I · 151 Pokémon</Text>
                </View>
            </Animated.View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const RED    = '#EF5350';
const CARD   = '#0f1420';
const BORDER = '#1a2235';

const s = StyleSheet.create({
    screen:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
    bgBase:    { ...StyleSheet.absoluteFillObject, backgroundColor: '#050810' },
    bgGlow:    { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: '#1a0505', opacity: 0.6 },
    topBar:    { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: RED },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: '#f5f5f0', borderTopWidth: 2, borderTopColor: '#1a1a2e' },

    cardWrap: {
        width: width * 0.88, maxWidth: 400,
        borderRadius: 20, overflow: 'hidden',
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

    fieldLabel: { color: '#3a5068', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6, alignSelf: 'flex-start' },
    input: {
        backgroundColor: '#070b14', borderWidth: 1, borderColor: BORDER,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
        marginBottom: 16, fontSize: 15, color: '#e2e8f0', width: '100%',
    },

    errorBox: {
        width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#2d0a0a', borderRadius: 8, borderWidth: 1,
        borderColor: '#5a1a1a', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    },
    errorIcon: { fontSize: 14 },
    errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', flex: 1 },

    loginBtn: {
        backgroundColor: RED, borderRadius: 10, paddingVertical: 14,
        alignItems: 'center', width: '100%',
        borderWidth: 1, borderColor: '#ff867c40', marginTop: 4,
    },
    loginBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },

    registerBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, marginTop: 4 },
    registerText: { color: '#3a5068', fontSize: 13 },
    registerLink: { color: RED, fontSize: 13, fontWeight: '700' },

    footer: { color: '#1e3050', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 16 },
});