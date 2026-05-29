import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';

type ButtonProps = TouchableOpacityProps & {
    label: string;
};

export const Button = ({ label, ...rest }: ButtonProps) => (
    <TouchableOpacity style={s.button} activeOpacity={0.8} {...rest}>
        <Text style={s.text}>{label}</Text>
    </TouchableOpacity>
);

const s = StyleSheet.create({
    button: {
        backgroundColor: '#EF5350',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#ff867c40',
        marginTop: 4,
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
});