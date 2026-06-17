import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
    placeholder: string;
};

export const Input = ({ placeholder, ...rest }: InputProps) => (
    <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor="#243044"
        {...rest}
    />
);

const s = StyleSheet.create({
    input: {
        backgroundColor: '#070b14',
        borderWidth: 1,
        borderColor: '#1a2235',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 16,
        fontSize: 15,
        color: '#e2e8f0',
        width: '100%',
    },
});