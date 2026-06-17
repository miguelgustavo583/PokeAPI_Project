import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';

const { width, height } = Dimensions.get('window');

type ContainerProps = { children: React.ReactNode };

// Pokébolas flutuantes com posição e tamanho fixos
const BALLS: Array<{ id: number; x: number | `${number}%`; size: number; duration: number; delay: number }> = [
    { id: 1, x: '5%',  size: 40, duration: 7000, delay: 0    },
    { id: 2, x: '20%', size: 24, duration: 9000, delay: 800  },
    { id: 3, x: '40%', size: 52, duration: 6500, delay: 400  },
    { id: 4, x: '58%', size: 30, duration: 8500, delay: 1200 },
    { id: 5, x: '75%', size: 20, duration: 7500, delay: 200  },
    { id: 6, x: '88%', size: 44, duration: 9500, delay: 1600 },
    { id: 7, x: '30%', size: 18, duration: 8000, delay: 600  },
    { id: 8, x: '65%', size: 34, duration: 7200, delay: 1000 },
];

// Mini pokébola flutuante
const FloatingBall = ({ x, size, duration, delay }: {
    x: number | `${number}%`; size: number; duration: number; delay: number;
}) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
    const opacity    = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.18, 0.18, 0] });
    const rotate     = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <Animated.View style={[
            fb.ball,
            { left: x, width: size, height: size, borderRadius: size / 2 },
            { transform: [{ translateY }, { rotate }], opacity },
        ]}>
            <View style={[fb.top,    { height: size * 0.38 }]} />
            <View style={[fb.stripe, { height: size * 0.14 }]} />
            <View style={[fb.bottom, { height: size * 0.38 }]} />
            <View style={[fb.center, {
                width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
                top: size * 0.33, left: size * 0.36,
            }]} />
        </Animated.View>
    );
};

const fb = StyleSheet.create({
    ball:   { position: 'absolute', bottom: 60, overflow: 'hidden', borderWidth: 1.5, borderColor: '#1a1a2e' },
    top:    { backgroundColor: '#EF5350' },
    stripe: { backgroundColor: '#1a1a2e' },
    bottom: { backgroundColor: '#f5f5f0' },
    center: { position: 'absolute', backgroundColor: '#1a1a2e' },
});

// Partícula de estrela pulsante
const Star = ({ x, y, size, delay }: { x: number | `${number}%`; y: number | `${number}%`; size: number; delay: number }) => {
    const pulse = useRef(new Animated.Value(0.2)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(pulse, { toValue: 1,   duration: 2500, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.2, duration: 2500, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View style={{
            position: 'absolute', left: x, top: y,
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: '#EF5350', opacity: pulse,
        }} />
    );
};

const STARS: Array<{ id: number; x: `${number}%`; y: `${number}%`; size: number; delay: number }> = [
    { id: 1,  x: '8%',  y: '12%', size: 3, delay: 0    },
    { id: 2,  x: '22%', y: '28%', size: 2, delay: 500  },
    { id: 3,  x: '45%', y: '8%',  size: 4, delay: 300  },
    { id: 4,  x: '68%', y: '20%', size: 2, delay: 800  },
    { id: 5,  x: '85%', y: '35%', size: 3, delay: 200  },
    { id: 6,  x: '15%', y: '55%', size: 2, delay: 1000 },
    { id: 7,  x: '55%', y: '60%', size: 3, delay: 600  },
    { id: 8,  x: '90%', y: '65%', size: 2, delay: 400  },
    { id: 9,  x: '35%', y: '75%', size: 4, delay: 700  },
    { id: 10, x: '72%', y: '80%', size: 2, delay: 900  },
];

export const Container = ({ children }: ContainerProps) => (
    <View style={s.wrapper}>
        {/* Fundo em camadas */}
        <View style={s.bgBase} />
        <View style={s.bgGlow} />

        {/* Grade de pontos sutil */}
        <View style={s.gridOverlay} />

        {/* Faixa vermelha no topo */}
        <View style={s.topBar} />

        {/* Estrelas pulsantes */}
        {STARS.map(st => <Star key={st.id} x={st.x} y={st.y} size={st.size} delay={st.delay} />)}

        {/* Pokébolas flutuantes */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {BALLS.map(b => (
                <FloatingBall key={b.id} x={b.x} size={b.size} duration={b.duration} delay={b.delay} />
            ))}
        </View>

        {/* Faixa branca rodapé */}
        <View style={s.bottomBar} />

        {/* Conteúdo */}
        <View style={s.content}>{children}</View>
    </View>
);

const s = StyleSheet.create({
    wrapper:     { flex: 1 },
    bgBase:      { ...StyleSheet.absoluteFillObject, backgroundColor: '#050810' },
    bgGlow:      {
        position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
        backgroundColor: '#1a0505', opacity: 0.6,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.03,
        backgroundColor: 'transparent',
    },
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 4, backgroundColor: '#EF5350',
    },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 4, backgroundColor: '#f5f5f0',
        borderTopWidth: 2, borderTopColor: '#1a1a2e',
    },
    content: {
        flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16,
    },
});