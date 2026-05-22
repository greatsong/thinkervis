const form=document.querySelector("#journal-form");const output=document.querySelector("#markdown-output");const copyButton=document.querySelector("#copy-button");const downloadButton=document.querySelector("#download-button");const toast=document.querySelector("#toast");const today=new Date;const yyyy=today.getFullYear();const mm=String(today.getMonth()+1).padStart(2,"0");const dd=String(today.getDate()).padStart(2,"0");form.elements.date.value=`${yyyy}-${mm}-${dd}`;const fallback={goal:"오늘 프로젝트에서 확인하고 싶은 목표를 적는다.",done:"아직 작성하지 않았다.",blocked:"아직 발견한 문제를 적지 않았다.",learned:"오늘 새로 알게 된 점을 적는다.",next:"다음 시간에 가장 먼저 할 일을 적는다."};function linesToBullets(value,fallbackText){const lines=value.split("\n").map(line=>line.trim()).filter(Boolean);if(!lines.length)return`- ${fallbackText}`;return lines.map(line=>`- ${line.replace(/^[-*]\s*/,"")}`).join("\n")}function buildMarkdown(){const data=new FormData(form);const projectName=String(data.get("projectName")||"나의 프로젝트").trim();const date=String(data.get("date")||`${yyyy}-${mm}-${dd}`).trim();const goal=String(data.get("goal")||fallback.goal).trim();const done=String(data.get("done")||"").trim();const blocked=String(data.get("blocked")||"").trim();const learned=String(data.get("learned")||"").trim();const next=String(data.get("next")||"").trim();return`# ${date} 프로젝트 일지

## 프로젝트
${projectName}

## 오늘의 목표
- ${goal||fallback.goal}

## 오늘 한 일
${linesToBullets(done,fallback.done)}

## 막힌 점 / 오류
${linesToBullets(blocked,fallback.blocked)}

## 배운 점
${linesToBullets(learned,fallback.learned)}

## 다음 할 일
${linesToBullets(next,fallback.next)}

## 증거 자료
- 사진, 실행 화면, 오류 메시지 캡처를 여기에 추가한다.
- 예: \`![센서 연결 사진](../../images/sensor-wiring.jpg)\`
`}function render(){output.textContent=buildMarkdown()}function showToast(message){toast.textContent=message;toast.classList.add("is-visible");window.setTimeout(()=>toast.classList.remove("is-visible"),1800)}async function copyMarkdown(){const text=buildMarkdown();try{await navigator.clipboard.writeText(text);showToast("Markdown을 복사했습니다.")}catch{showToast("복사를 지원하지 않는 브라우저입니다.")}}function downloadMarkdown(){const date=form.elements.date.value||`${yyyy}-${mm}-${dd}`;const blob=new Blob([buildMarkdown()],{type:"text/markdown;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`${date}.md`;document.body.append(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);showToast(".md 파일을 만들었습니다.")}form.addEventListener("input",render);copyButton.addEventListener("click",copyMarkdown);downloadButton.addEventListener("click",downloadMarkdown);render();
