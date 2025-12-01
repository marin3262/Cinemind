import { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// InnerContent를 LoginScreen 밖으로 분리하여 불필요한 리렌더링 방지
const InnerContent = ({ email, password, setEmail, setPassword, handleLogin, router }: any) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>
        <FontAwesome name="film" size={36} color={Colors.light.primary} /> CineMind
      </Text>
      <Text style={styles.subtitle}>당신만의 영화 추천을 받아보세요.</Text>
    </View>

    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>로그인</Text>
      </TouchableOpacity>


    </View>

    <View style={styles.signupContainer}>
      <Text style={styles.signupText}>계정이 없으신가요? </Text>
      <TouchableOpacity onPress={() => router.push('/signup')}>
        <Text style={[styles.signupText, styles.signupLink]}>회원가입</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function LoginScreen() {
  const { onLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const result = await onLogin(email, password);
    if (result && !result.success) {
      Alert.alert("로그인 실패", String(result.error));
    }
  };

  const innerContentProps = { email, password, setEmail, setPassword, handleLogin, router };

  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS === 'web' ? (
        <InnerContent {...innerContentProps} />
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoiding}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <InnerContent {...innerContentProps} />
          </TouchableWithoutFeedback>
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
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#4B5563', marginBottom: 8 },
  input: { width: '100%', padding: 16, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8, fontSize: 18 },
  loginButton: { width: '100%', backgroundColor: Colors.light.primary, padding: 16, borderRadius: 8, alignItems: 'center' },
  loginButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  signupContainer: { marginTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { color: Colors.light.textSecondary, fontSize: 16 },
  signupLink: { fontWeight: 'bold', color: Colors.light.primary },
});
