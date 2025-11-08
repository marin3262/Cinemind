import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import API_BASE_URL from '@/constants/config';

const InnerContent = (props: any) => {
    const { username, email, password, passwordConfirm, setUsername, setEmail, setPassword, setPasswordConfirm, handleSignUp, handleCheckUsername, handleCheckEmail, usernameChecked, emailChecked, router } = props;
    
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}><FontAwesome name="film" size={36} color={Colors.light.primary} /> CineMind</Text>
                <Text style={styles.subtitle}>CineMind에 오신 것을 환영합니다.</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>아이디</Text>
                    <View style={styles.fieldContainer}>
                        <TextInput style={[styles.input, styles.fieldInput]} placeholder="아이디를 입력하세요" value={username} onChangeText={setUsername} autoCapitalize="none" />
                        <TouchableOpacity style={[styles.checkButton, usernameChecked && styles.checkedButton]} onPress={handleCheckUsername}>
                            <Text style={styles.checkButtonText}>{usernameChecked ? '✓' : '중복 확인'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>이메일</Text>
                    <View style={styles.fieldContainer}>
                        <TextInput style={[styles.input, styles.fieldInput]} placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <TouchableOpacity style={[styles.checkButton, emailChecked && styles.checkedButton]} onPress={handleCheckEmail}>
                            <Text style={styles.checkButtonText}>{emailChecked ? '✓' : '중복 확인'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>비밀번호</Text>
                    <TextInput style={styles.input} placeholder="6자리 이상 입력하세요" value={password} onChangeText={setPassword} secureTextEntry />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>비밀번호 확인</Text>
                    <TextInput style={styles.input} placeholder="••••••••" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
                </View>
                <TouchableOpacity style={[styles.signupButton, (!usernameChecked || !emailChecked) && styles.disabledButton]} onPress={handleSignUp} disabled={!usernameChecked || !emailChecked}>
                    <Text style={styles.signupButtonText}>회원가입</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.loginContainer}>
                <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
                <TouchableOpacity onPress={() => router.replace('/login')}><Text style={[styles.loginText, styles.loginLink]}>로그인</Text></TouchableOpacity>
            </View>
        </View>
    );
};

export default function SignUpScreen() {
    const { onSignup } = useAuth();
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [usernameChecked, setUsernameChecked] = useState(false);
    const [emailChecked, setEmailChecked] = useState(false);

    const handleCheck = async (type: 'username' | 'email', value: string) => {
        if (!value) {
            Alert.alert("알림", `${type === 'username' ? '아이디를' : '이메일을'} 입력해주세요.`);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/auth/check-${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [type]: value }),
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert("성공", data.message);
                if (type === 'username') setUsernameChecked(true);
                else setEmailChecked(true);
            } else {
                throw new Error(data.detail);
            }
        } catch (e: any) {
            Alert.alert("오류", e.message);
            if (type === 'username') setUsernameChecked(false);
            else setEmailChecked(false);
        }
    };

    const handleSignUp = async () => {
        if (!usernameChecked || !emailChecked) {
            Alert.alert("알림", "아이디와 이메일 중복 확인을 먼저 진행해주세요.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("오류", "비밀번호는 6자리 이상이어야 합니다.");
            return;
        }
        if (password !== passwordConfirm) {
            Alert.alert("오류", "비밀번호가 일치하지 않습니다.");
            return;
        }
        const result = await onSignup(username, email, password);
        if (result && !result.success) {
              Alert.alert("회원가입 실패", String(result.error));
            }    };

    const innerContentProps = { username, email, password, passwordConfirm, setUsername, setEmail, setPassword, setPasswordConfirm, handleSignUp, handleCheckUsername: () => handleCheck('username', username), handleCheckEmail: () => handleCheck('email', email), usernameChecked, emailChecked, router };

    return (
        <SafeAreaView style={styles.safeArea}>
            {Platform.OS === 'web' ? (<InnerContent {...innerContentProps} />) : (
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoiding}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}><InnerContent {...innerContentProps} /></TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.light.background },
    keyboardAvoiding: { flex: 1 },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#F3F4F6' },
    header: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 40, fontWeight: 'bold', color: Colors.light.primary, flexDirection: 'row', alignItems: 'center' },
    subtitle: { fontSize: 16, color: Colors.light.textSecondary, marginTop: 8 },
    formContainer: { width: '100%', maxWidth: 400, backgroundColor: Colors.light.card, padding: 32, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', color: '#4B5563', marginBottom: 8 },
    input: { width: '100%', padding: 16, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, fontSize: 18 },
    fieldContainer: { flexDirection: 'row', alignItems: 'center' },
    fieldInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
    checkButton: { paddingHorizontal: 16, height: 58, backgroundColor: Colors.light.textSecondary, justifyContent: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8 },
    checkedButton: { backgroundColor: Colors.light.primary },
    checkButtonText: { color: 'white', fontWeight: 'bold' },
    signupButton: { width: '100%', backgroundColor: Colors.light.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    signupButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    disabledButton: { backgroundColor: '#D1D5DB' },
    loginContainer: { marginTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    loginText: { color: Colors.light.textSecondary, fontSize: 16 },
    loginLink: { fontWeight: 'bold', color: Colors.light.primary },
});
