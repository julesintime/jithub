# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - heading "404" [level=1] [ref=e6]
      - img [ref=e8]
    - generic [ref=e10]:
      - heading "Page Not Found" [level=2] [ref=e11]
      - paragraph [ref=e12]: Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
    - generic [ref=e13]:
      - paragraph [ref=e14]: "Try these popular pages:"
      - generic [ref=e15]:
        - link "Home" [ref=e16] [cursor=pointer]:
          - /url: /
          - button "Home" [ref=e17]
        - link "Frameworks" [ref=e18] [cursor=pointer]:
          - /url: /frameworks
          - button "Frameworks" [ref=e19]
        - link "Founders" [ref=e20] [cursor=pointer]:
          - /url: /founders
          - button "Founders" [ref=e21]
        - link "Blog" [ref=e22] [cursor=pointer]:
          - /url: /blog
          - button "Blog" [ref=e23]
    - link "Back to Home" [ref=e24] [cursor=pointer]:
      - /url: /
      - button "Back to Home" [ref=e25]
    - paragraph [ref=e26]:
      - text: Looking for something specific?
      - link "Contact us" [ref=e27] [cursor=pointer]:
        - /url: /contact
  - alert [ref=e28]
```