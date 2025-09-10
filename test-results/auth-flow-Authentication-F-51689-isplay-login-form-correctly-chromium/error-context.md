# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e8]: FF
        - heading "Welcome to FibreField" [level=3] [ref=e9]
        - paragraph [ref=e10]: Sign in to access your field data collection dashboard
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]:
            - generic [ref=e14]: Email
            - textbox "Email" [ref=e15]
          - generic [ref=e16]:
            - generic [ref=e17]: Password
            - textbox "Password" [ref=e18]
          - link "Forgot password?" [ref=e20] [cursor=pointer]:
            - /url: /auth/forgot-password
        - generic [ref=e21]:
          - button "Sign In" [ref=e22]:
            - img [ref=e23]
            - text: Sign In
          - generic [ref=e26]:
            - text: Don't have an account?
            - link "Register here" [ref=e27] [cursor=pointer]:
              - /url: /auth/register
    - generic [ref=e28]: FibreField PWA v1.0 | Secure Field Data Collection
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]:
    - img [ref=e35] [cursor=pointer]
  - alert [ref=e38]
```