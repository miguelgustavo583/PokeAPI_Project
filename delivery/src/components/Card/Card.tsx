import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { login } from '../../integration/authIntegration';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
import React from 'react';

const { width }      = Dimensions.get('window');

// Pokébola decorativa feita com Views
const Pokeball = () => (
    <View style={pb.ball}>
        <View style={pb.top} />
        <View style={pb.stripe} />
        <View style={pb.bottom} />
        <View style={pb.center} />
        <View style={pb.centerInner} />
    </View>
);

export const Card = () => {
    const [trainer,  setTrainer]  = useState('');
    const [password, setPassword] = useState('');
    const [message,  setMessage]  = useState('');
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setMessage('');
        if (!trainer.trim() || !password) return setMessage('Preencha todos os campos.');
        try {
            setLoading(true);
            const user = await login(trainer.trim(), password);
            const userId = user.id ?? user.userId ?? user.user_id;
            // Salva o usuário localmente para usar nas outras telas
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
        <View style={s.wrapper}>
            {/* Faixa vermelha/branca topo — pokébola */}
            <View style={s.topStripe}>
                <View style={s.stripeRed} />
                <View style={s.stripeBlack} />
                <View style={s.stripeWhite} />
            </View>

            <View style={s.card}>
                {/* Pokébola central */}
                <Pokeball />

                {/* Títulos */}
                <Text style={s.eyebrow}>PROFESSOR OAK</Text>
                <Text style={s.title}>Área do Treinador</Text>
                <Text style={s.subtitle}>Identifique-se para acessar sua Pokédex</Text>

                <View style={s.divider} />

                {/* Campos */}
                <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>🎮  TREINADOR</Text>
                    <Input
                        placeholder="Nome do treinador"
                        value={trainer}
                        onChangeText={setTrainer}
                        autoCapitalize="none"
                    />
                </View>

                <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>🔑  SENHA</Text>
                    <Input
                        placeholder="Senha secreta"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {message !== '' && (
                    <View style={s.errorBox}>
                        <Text style={s.errorIcon}>⚠</Text>
                        <Text style={s.errorText}>{message}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    style={[s.loginBtnMain, loading && { opacity: 0.7 }]}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.loginBtnText}>INICIAR JORNADA  →</Text>
                    }
                </TouchableOpacity>

                <View style={s.divider} />

                <Link href="/register" asChild>
                    <TouchableOpacity style={s.registerBtn}>
                        <Text style={s.registerText}>Novo por aqui?  </Text>
                        <Text style={s.registerLink}>Criar conta →</Text>
                    </TouchableOpacity>
                </Link>

                <Text style={s.footer}>Pokédex · Geração I · 151 Pokémon</Text>
            </View>
        </View>
    );
};

// ─── Pokébola ─────────────────────────────────────────────────────────────────
const pb = StyleSheet.create({
    ball: {
        width: 72, height: 72, borderRadius: 36,
        overflow: 'hidden', borderWidth: 3, borderColor: '#1a1a2e',
        marginBottom: 20, marginTop: 4,
        shadowColor: '#EF5350',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    top:         { width: 72, height: 30, backgroundColor: '#EF5350' },
    stripe:      { width: 72, height: 12, backgroundColor: '#1a1a2e' },
    bottom:      { width: 72, height: 30, backgroundColor: '#f5f5f0' },
    center: {
        position: 'absolute', width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#1a1a2e', top: 26, left: 26,
    },
    centerInner: {
        position: 'absolute', width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#f5f5f0', top: 31, left: 31,
    },
});

// ─── Paleta ───────────────────────────────────────────────────────────────────
const BG   = '#0a0e1a';
const CARD = '#0f1420';
const RED  = '#EF5350';
const BORDER = '#1a2235';

const s = StyleSheet.create({
    wrapper: {
        width: width * 0.88,
        maxWidth: 400,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 18,
    },

    topStripe:   { flexDirection: 'row', height: 5 },
    stripeRed:   { flex: 2, backgroundColor: RED },
    stripeBlack: { flex: 0.3, backgroundColor: '#1a1a2e' },
    stripeWhite: { flex: 2, backgroundColor: '#f5f5f0' },

    card: {
        backgroundColor: CARD,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: BORDER,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },

    eyebrow: {
        color: RED,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 3.5,
        marginBottom: 6,
    },
    title: {
        color: '#f1f5f9',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    subtitle: {
        color: '#3a5068',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 18,
    },

    divider: {
        width: '100%',
        height: 0.5,
        backgroundColor: BORDER,
        marginBottom: 24,
    },

    fieldGroup:  { width: '100%', marginBottom: 4 },
    fieldLabel:  {
        color: '#3a5068',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 6,
    },

    errorBox: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2d0a0a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#5a1a1a',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
    },
    errorIcon: { fontSize: 14 },
    errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', flex: 1 },

    footer: {
        color: '#1e3050',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginTop: 20,
    },

    loginBtnMain: {
        backgroundColor: '#EF5350',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#ff867c40',
        marginTop: 4,
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    registerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        marginTop: 4,
    },
    registerText: { color: '#3a5068', fontSize: 13 },
    registerLink: { color: '#EF5350', fontSize: 13, fontWeight: '700' },
});