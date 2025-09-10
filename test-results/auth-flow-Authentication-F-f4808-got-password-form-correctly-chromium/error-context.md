# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e8]: FF
      - heading "Reset Password" [level=3] [ref=e9]
      - paragraph [ref=e10]: Enter your email address and we'll send you a link to reset your password
    - generic [ref=e11]:
      - generic [ref=e13]:
        - generic [ref=e14]: Email Address
        - textbox "Email Address" [ref=e15]
      - generic [ref=e16]:
        - button "Send Reset Email" [disabled]:
          - img
          - text: Send Reset Email
    - link "Back to Sign In" [ref=e18] [cursor=pointer]:
      - /url: /auth/login
      - img [ref=e19] [cursor=pointer]
      - text: Back to Sign In
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27] [cursor=pointer]
  - alert [ref=e30]
```