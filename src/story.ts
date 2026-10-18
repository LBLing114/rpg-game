import {
  L,
  type Dialogue,
  type EndingId,
  type ItemId,
  type Scene,
  type State,
  type Text,
} from "./types";

export const has = (s: State, item: ItemId) => s.inventory.includes(item);
export const flag = (s: State, f: State["flags"][number]) =>
  s.flags.includes(f);
export const evidenceCount = (s: State) =>
  (["proof", "record", "testimony"] as ItemId[]).filter((i) => has(s, i))
    .length;
export const canWitness = (s: State) =>
  evidenceCount(s) === 3 && flag(s, "trusted");
export const canEmbers = (s: State) =>
  flag(s, "protected") && flag(s, "remembered") && has(s, "record");

export const items: Record<
  ItemId,
  { name: Text; description: Text; icon: string }
> = {
  letter: {
    name: L("未寄出的信", "Unsent letter"),
    description: L(
      "弟弟沈泊的笔迹。背面写着：“别信那封检举信。找出第三份校样，天亮前到江边。”信没有署日期。",
      "Your brother Shen Bo’s handwriting: “Do not believe the accusation. Find the third proof. Come to the river before dawn.” There is no date.",
    ),
    icon: "letter",
  },
  key: {
    name: L("黄铜钥匙", "Brass key"),
    description: L(
      "周姨替你保管的旧家钥匙。齿缝里还有一点蓝色的油漆。可以回到沈家旧屋。",
      "Aunt Zhou kept your old house key. Blue paint remains between its teeth. It opens the Shen family home.",
    ),
    icon: "key",
  },
  photo: {
    name: L("半张合影", "Torn photograph"),
    description: L(
      "1956 年，上海。你、沈泊和顾先生站在江边。背后只有一句：“记得我们本来的名字。”",
      "Shanghai, 1956. You, Shen Bo, and Mr. Gu stand by the river. On the back: “Remember our real names.”",
    ),
    icon: "photo",
  },
  proof: {
    name: L("第三份校样", "Third proof"),
    description: L(
      "林岚保存的印刷校样。你的名字被另一种铅字补进检举信；原稿里没有署名。这是一份伪造的指控。",
      "A printing proof kept by Lin Lan. Your name was inserted into the accusation in a different typeface. The original was unsigned. The accusation was forged.",
    ),
    icon: "paper",
  },
  record: {
    name: L("转运名册抄件", "Transfer register"),
    description: L(
      "档案名册的抄件：沈泊于十一月十四日被转往外地。签收栏空白。他并非传言中的告密者，下落仍不明。",
      "A copy of the register: Shen Bo was transferred out of Shanghai on November 14. No one signed for his arrival. He was not the informer in the rumors. His fate remains unknown.",
    ),
    icon: "book",
  },
  testimony: {
    name: L("医生的证言", "Doctor’s testimony"),
    description: L(
      "罗医生亲笔证明：所谓检举发生的那一夜，你一直在诊所救助伤者。落款用了她的真名。",
      "Dr. Luo’s signed account: on the night of the alleged accusation, you were helping the wounded at her clinic. She has signed her real name.",
    ),
    icon: "paper",
  },
  ticket: {
    name: L("末班船票", "Last ferry ticket"),
    description: L(
      "一张驶向吴淞的船票。不是逃离时代的出口，只是一段尚能自己选择的路。",
      "A ticket to Wusong. It cannot take you beyond the reach of the times, but it offers one stretch of road you can choose yourself.",
    ),
    icon: "ticket",
  },
};

const back = { label: L("收起思绪", "Step back") };
const leave = { label: L("暂且告别", "Say goodbye") };
export const dialogues: Record<string, Dialogue> = {
  intro: {
    speaker: L("沈砚", "Shen Yan"),
    role: L("归人", "The returnee"),
    portrait: "shen",
    text: L(
      "上海，一九六八年，深秋。\n归国的第十一年，名字成了罪证，家成了不敢敲响的门。今晚，一封没有邮戳的信把我带回槐生里。\n弟弟失踪后，我第一次认出了他的笔迹。",
      "Shanghai, late autumn, 1968.\nEleven years after returning from overseas, my name has become an accusation, my home a door I dare not knock on. Tonight, a letter without a postmark brings me back to Huaisheng Lane.\nFor the first time since my brother vanished, I recognize his handwriting.",
    ),
    choices: [
      {
        label: L(
          "把信收好，走进雨里",
          "Pocket the letter. Step into the rain.",
        ),
        flags: ["intro"],
        note: L(
          "回到槐生里。先向门前的周姨打听旧屋与弟弟的消息。",
          "Back in Huaisheng Lane. Ask Aunt Zhou about the old home and your brother.",
        ),
      },
    ],
  },
  aunt: {
    speaker: L("周姨", "Aunt Zhou"),
    role: L("守门的人", "The one who stayed"),
    portrait: "aunt",
    text: L(
      "“小沈？……别站在灯底下。”\n她把一只搪瓷杯放下，目光停在你磨破的袖口。\n“你弟弟走前，把钥匙留给我。他说，哥哥总有一天会回来。那孩子……从没说过你一句坏话。”",
      "“Yan? … Don’t stand beneath the light.”\nShe sets down an enamel cup, looking at your frayed sleeve.\n“Your brother left me the key. He said you would come home one day. That boy… he never spoke a word against you.”",
    ),
    choices: [
      {
        label: L(
          "接过钥匙：我想回家看看",
          "Take the key. “I want to see home.”",
        ),
        items: ["key"],
        flags: ["aunt"],
        next: "auntKey",
        note: L(
          "周姨归还了钥匙。沈家旧屋就在里弄尽头。",
          "Aunt Zhou returned the key. The family home is at the end of the lane.",
        ),
      },
      {
        label: L(
          "压低声音：谁送来的信？",
          "Lower your voice. “Who brought the letter?”",
        ),
        next: "auntLetter",
      },
    ],
  },
  auntLetter: {
    speaker: L("周姨", "Aunt Zhou"),
    portrait: "aunt",
    text: L(
      "“一个印刷铺的姑娘，姓林。她的手上都是洗不掉的墨。”\n周姨把钥匙塞进你掌心。\n“这些年，我学会了少问一句。但有些门，总得留着钥匙。”",
      "“A girl from the printing shop. Lin, I think. Ink on her hands that would not wash away.”\nAunt Zhou presses the key into your palm.\n“I’ve learned to ask fewer questions. But some doors still deserve a key.”",
    ),
    choices: [
      {
        label: L("握住钥匙，向她道谢", "Accept the key and thank her"),
        items: ["key"],
        flags: ["aunt"],
        note: L(
          "信由印刷铺的林岚送来。周姨替我保留了旧屋钥匙。",
          "Lin Lan from the printing shop delivered the letter. Aunt Zhou kept the key for me.",
        ),
      },
    ],
  },
  auntKey: {
    speaker: L("周姨", "Aunt Zhou"),
    portrait: "aunt",
    text: L(
      "“印刷铺还亮着灯。送信的姑娘在等你。”\n她抬起头，像在听墙里的雨声。\n“要是有人问起，我今晚谁也没见过。你记得我就好。”",
      "“The printing shop still has its light on. The girl who delivered the letter is waiting.”\nShe looks up, as if listening to rain inside the walls.\n“If anyone asks, I saw no one tonight. It is enough that you remember me.”",
    ),
    choices: [leave],
  },
  auntAgain: {
    speaker: L("周姨", "Aunt Zhou"),
    portrait: "aunt",
    text: L(
      "“门开着。人还在，家就不算空。”\n她用袖子擦去门牌上的雨水。你终于看清那三个褪色的字：槐生里。",
      "“The door is open. As long as someone remains, a home is not empty.”\nShe wipes rain from the enamel street plate. The faded characters emerge: Huaisheng Lane.",
    ),
    choices: [leave],
  },
  wall: {
    speaker: L("斑驳的墙", "The weathered wall"),
    portrait: "narrator",
    text: L(
      "层层纸张遮住了旧门牌。雨水把墨迹拖成长长的黑线。\n最底下一张纸的角落，露出弟弟画过的小船。小时候他说，船不用认字，也知道哪边是回家的路。\n我没有撕下它。",
      "Layers of paper cover an old street plate. Rain draws the ink into long black lines.\nIn the corner of the lowest sheet is a little boat my brother once drew. As a child he said boats need not read to know the way home.\nI leave it where it is.",
    ),
    choices: [back],
  },
  desk: {
    speaker: L("旧书桌", "The old desk"),
    portrait: "narrator",
    text: L(
      "抽屉里没有书，只有半张合影。照片上的你仍穿着归国那天的西装。沈泊笑得模糊，顾先生的脸被一道折痕穿过。\n你把照片翻过来：“记得我们本来的名字。”\n窗外有人走过。脚步没有停。",
      "There are no books in the drawer, only half a photograph. You are still wearing the suit you returned home in. Shen Bo’s smile is blurred; a crease crosses Mr. Gu’s face.\nOn the back: “Remember our real names.”\nFootsteps pass outside. They do not stop.",
    ),
    choices: [
      {
        label: L("收起合影", "Keep the photograph"),
        items: ["photo"],
        note: L(
          "在旧屋找到合影。顾先生也在照片里，也许诊所里能见到他。",
          "Found an old photograph. Mr. Gu is in it too. He may be at the clinic.",
        ),
      },
    ],
  },
  deskAgain: {
    speaker: L("旧书桌", "The old desk"),
    portrait: "narrator",
    text: L(
      "照片的位置留下一块浅色的木头。\n书可以搬走，人的轮廓却留在灰尘里。",
      "A pale patch remains where the photograph lay.\nBooks can be taken away; people leave their shapes in the dust.",
    ),
    choices: [back],
  },
  mirror: {
    speaker: L("沈砚", "Shen Yan"),
    portrait: "shen",
    text: L(
      "镜子裂成两半。左边是归国时的我，右边是现在的我。\n在里昂学建筑的时候，我以为只要房子足够结实，人就能安稳地住进去。\n后来才知道，门也会从外面锁上。",
      "The mirror is split in two. On the left is the man who came home; on the right is the man I am now.\nWhen I studied architecture in Lyon, I thought that sturdy houses could keep people safe.\nLater, I learned that doors could be locked from outside.",
    ),
    choices: [back],
  },
  lin: {
    speaker: L("林岚", "Lin Lan"),
    role: L("排字工", "The typesetter"),
    portrait: "lin",
    text: L(
      "“你终于来了。”\n林岚没有抬头，指尖停在一枚铅字上。\n“检举信印了三次。第三份校样里，你的名字，比别的字新。有人后来加上去的。”\n她看了一眼门：“你信我吗？”",
      "“You finally came.”\nLin Lan keeps her eyes on a piece of lead type.\n“The accusation was printed three times. In the third proof, your name is newer than the surrounding type. Someone added it later.”\nShe glances at the door. “Do you trust me?”",
    ),
    choices: [
      {
        label: L(
          "“我信。也请你相信我。”",
          "“I do. And I need you to trust me.”",
        ),
        flags: ["trusted"],
        next: "linProof",
        note: L(
          "选择相信林岚。她愿意帮助我把真相保存下来。",
          "I chose to trust Lin Lan. She will help preserve the truth.",
        ),
      },
      {
        label: L("“让我先看看校样。”", "“Let me see the proof first.”"),
        next: "linProof",
      },
    ],
  },
  linProof: {
    speaker: L("林岚", "Lin Lan"),
    portrait: "lin",
    text: L(
      "她从印刷机下面抽出一张薄纸。\n“你弟弟找到了它，后来就被带走了。转运名册还在档案室。他不是出卖你的人。”\n你读着那行熟悉又陌生的名字。十一年的沉默，第一次有了一个破口。",
      "She draws a thin sheet from beneath the press.\n“Your brother found this. Then they took him away. The transfer register is still in the archive. He was not the one who betrayed you.”\nYou read the familiar, unfamiliar name. For the first time, eleven years of silence have a crack in them.",
    ),
    choices: [
      {
        label: L("带走校样，寻找名册", "Take the proof. Find the register."),
        items: ["proof"],
        note: L(
          "校样证明检举信被篡改。去档案室寻找沈泊的转运名册；罗医生也许知道那一夜的事情。",
          "The proof shows the accusation was altered. Search the archive for Shen Bo’s transfer record, and ask Dr. Luo about that night.",
        ),
      },
    ],
  },
  linAgain: {
    speaker: L("林岚", "Lin Lan"),
    portrait: "lin",
    text: L(
      "“独自藏起一张纸，是秘密。让另一个人记得它，才有可能成为证据。”\n她整理着散落的铅字，给你让出灯下的位置。\n“我会在这里等。直到天亮。”",
      "“A paper hidden alone is a secret. When another person remembers it, it may become evidence.”\nShe gathers the scattered type, making room for you beneath the lamp.\n“I’ll wait here. Until morning.”",
    ),
    choices: [
      {
        label: L(
          "“我愿意和你一起保存这些。”",
          "“I want us to preserve these together.”",
        ),
        flags: ["trusted"],
        note: L(
          "与林岚约定：由两个人分别保存证据。",
          "Lin Lan and I agreed to keep separate copies of the evidence.",
        ),
      },
      leave,
    ],
  },
  typecase: {
    speaker: L("铅字盒", "The type case"),
    portrait: "narrator",
    text: L(
      "几千枚反写的字，整整齐齐地躺在木格里。“有罪”和“无罪”只差一枚铅字，却足以改变一个人的一生。\n旁边摆着一只纸船，船底印着一半没用完的地址。",
      "Thousands of reversed characters lie neatly in wooden compartments. One piece of type separates “guilty” from “innocent,” and can change a life.\nBeside them sits a paper boat, made from half an unused address label.",
    ),
    choices: [back],
  },
  doctor: {
    speaker: L("罗医生", "Dr. Luo"),
    role: L("夜班医生", "The night doctor"),
    portrait: "doctor",
    text: L(
      "“那天晚上你在这里。你替我扶着伤者，直到天亮。我记得。”\n她从白大褂里拿出钢笔。\n“我可以写下来。但我用了真名，别人就可能来问，是谁把这张纸带出去的。”",
      "“You were here that night. You held the wounded steady for me until morning. I remember.”\nShe takes a fountain pen from her coat.\n“I can write it down. But if I sign my name, someone may come asking who carried the paper out.”",
    ),
    choices: [
      {
        label: L(
          "“我会护住您的名字，由我承担。”",
          "“I’ll protect your name and take responsibility.”",
        ),
        flags: ["protected"],
        next: "doctorSigned",
        note: L(
          "答应保护罗医生。证明清白不该以另一个人的受难为代价。",
          "I promised to protect Dr. Luo. Clearing my name should not come at the cost of another person.",
        ),
      },
      {
        label: L(
          "“请写下您记得的全部。”",
          "“Please write down everything you remember.”",
        ),
        next: "doctorSigned",
      },
    ],
  },
  doctorSigned: {
    speaker: L("罗医生", "Dr. Luo"),
    portrait: "doctor",
    text: L(
      "钢笔在纸上停了一瞬，随后写下她的全名。\n“有些事，不应该只有做噩梦的人记得。”\n她把证言折好，又递来一张船票：“顾先生替你留的。天亮前有一班去吴淞的船。走不走，你自己定。”",
      "The pen hesitates, then writes her full name.\n“Some things should be remembered by more than the people who dream of them.”\nShe folds the testimony and offers a ferry ticket. “Mr. Gu kept this for you. A boat to Wusong leaves before dawn. You decide whether to take it.”",
    ),
    choices: [
      {
        label: L("收下证言与船票", "Accept the testimony and ticket"),
        items: ["testimony", "ticket"],
        note: L(
          "罗医生证明那一夜我在诊所。她还交给我一张末班船票。",
          "Dr. Luo confirms I was at the clinic that night. She also gave me a ticket for the last ferry.",
        ),
      },
    ],
  },
  doctorAgain: {
    speaker: L("罗医生", "Dr. Luo"),
    portrait: "doctor",
    text: L(
      "“纸会受潮，字会褪色。你自己也要活下去。”\n她把炉上的水倒进杯里。门帘后，顾先生轻轻咳了一声。",
      "“Paper gets wet. Ink fades. You must stay alive too.”\nShe pours water from the stove. Behind the curtain, Mr. Gu coughs softly.",
    ),
    choices: [
      {
        label: L(
          "承诺不向别人透露医生的名字",
          "Promise to keep the doctor’s name private",
        ),
        flags: ["protected"],
      },
      leave,
    ],
  },
  gu: {
    speaker: L("顾文山", "Gu Wenshan"),
    role: L("昔日的老师", "Your former teacher"),
    portrait: "gu",
    text: L(
      "“他们说，忘了就能睡个好觉。”\n顾先生坐在窗边，手指在膝上画着一座不存在的桥。\n“可我已经不记得，我妻子笑起来是什么样子了。小沈，你还记得我们去过江边吗？”",
      "“They say forgetting lets you sleep.”\nMr. Gu sits at the window, tracing a bridge that is not there on his knee.\n“But I can no longer remember my wife’s smile. Yan, do you remember when we went to the river?”",
    ),
    choices: [
      {
        label: L(
          "拿出半张合影：“我们都在这里。”",
          "Show the photograph. “We are all here.”",
        ),
        requires: (s) => has(s, "photo"),
        flags: ["remembered"],
        next: "guMemory",
        note: L(
          "把合影给顾先生看。他记起了沈泊，也记起了妻子的名字。",
          "I showed Mr. Gu the photograph. He remembered Shen Bo, and his wife’s name.",
        ),
      },
      {
        label: L("“我会替您记得。”", "“I will remember for you.”"),
        next: "guPromise",
      },
      leave,
    ],
  },
  guMemory: {
    speaker: L("顾文山", "Gu Wenshan"),
    portrait: "gu",
    text: L(
      "“青芜。她叫青芜。”\n他指着照片外的空白，忽然笑了。\n“是她替我们拍的。你弟弟非要把一只纸船放进水里。”\n窗外的雨小了一些。你们谁也没有说话，但房间不再那么空。",
      "“Qingwu. Her name was Qingwu.”\nHe points beyond the edge of the photograph and suddenly smiles.\n“She took the picture. Your brother insisted on setting a paper boat on the water.”\nThe rain eases. Neither of you speaks, but the room feels less empty.",
    ),
    choices: [leave],
  },
  guPromise: {
    speaker: L("顾文山", "Gu Wenshan"),
    portrait: "gu",
    text: L(
      "“替我回去看看吧。你家从前有一张照片。也许照片比我记得清楚。”\n他又低下头，把那座看不见的桥画完。",
      "“Go back and look, will you? There was a photograph in your home. It may remember more clearly than I do.”\nHe lowers his head and finishes the invisible bridge.",
    ),
    choices: [leave],
  },
  cabinet: {
    speaker: L("转运名册", "The transfer register"),
    portrait: "narrator",
    text: L(
      "在一排排用铅笔划掉的名字中，你找到了沈泊。\n“十一月十四日，转送外地。随身物品：书一本，旧围巾一条。”\n签收栏空着。你不知道他是否还活着，却终于知道，他没有出卖你。",
      "Among rows of names crossed out in pencil, you find Shen Bo.\n“November 14. Transferred out of the city. Personal effects: one book, one old scarf.”\nThe receipt column is empty. You do not know if he is alive, but you finally know he did not betray you.",
    ),
    choices: [
      {
        label: L("逐字抄下，保留原件", "Copy every word. Leave the original."),
        items: ["record"],
        flags: ["copied"],
        note: L(
          "抄下转运名册，原件仍在档案室。沈泊的去向没有记录。",
          "Copied the transfer register and left the original in place. Shen Bo’s destination is unrecorded.",
        ),
      },
      {
        label: L(
          "抄下名册，也留下自己的证言",
          "Copy the register. Add your own account.",
        ),
        items: ["record"],
        flags: ["copied", "confessed"],
        note: L(
          "抄下名册，并在空白纸上留下自己的证言。我不再把沉默当作唯一的保护。",
          "Copied the register and left my own account on a blank sheet. Silence will no longer be my only protection.",
        ),
      },
    ],
  },
  cabinetAgain: {
    speaker: L("转运名册", "The transfer register"),
    portrait: "narrator",
    text: L(
      "原件还在。\n你用手指轻轻抚平卷起的纸角。至少今晚，弟弟的名字没有被抹去。",
      "The original remains.\nYou smooth a curled corner of the paper. At least tonight, your brother’s name has not been erased.",
    ),
    choices: [back],
  },
  archiveWall: {
    speaker: L("停摆的钟", "The stopped clock"),
    portrait: "narrator",
    text: L(
      "墙上的钟停在四点十七分。\n这里的时间依照卷宗编号前进。一个人出生、读书、归来，然后变成一行待查的字。\n你听见自己的呼吸，像一页不肯翻过去的纸。",
      "The clock stopped at seventeen past four.\nHere time advances by file number. A person is born, studies, comes home, then becomes a line marked “pending investigation.”\nYour breathing sounds like a page that refuses to turn.",
    ),
    choices: [back],
  },
  water: {
    speaker: L("黄浦江", "The Huangpu River"),
    portrait: "narrator",
    text: L(
      "江水像一封没有写完的信。\n对岸的灯隔着雾亮了一下，随即又暗了下去。你想起弟弟放走的纸船。原来有些东西并不是消失了，只是还没有到岸。",
      "The river is an unfinished letter.\nA light across the water flares through the mist, then fades. You remember your brother’s paper boat. Perhaps some things have not vanished. Perhaps they have not reached the shore.",
    ),
    choices: [back],
  },
  finale: {
    speaker: L("天亮之前", "Before the dawn"),
    role: L("最后的选择", "The final choice"),
    portrait: "shen",
    text: L(
      "远处响起一声汽笛。\n口袋里的纸已经被体温焐热。你不能改变已经发生的事，却还可以决定，让什么渡过这条河。\n这一次，没有人替你作答。",
      "A ferry horn sounds in the distance.\nThe papers in your pocket are warm against your skin. You cannot change what has happened. But you can still choose what crosses this river.\nThis time, no one answers for you.",
    ),
    choices: [
      {
        label: L(
          "与林岚分存证据，留下名字",
          "Keep separate copies with Lin Lan. Preserve the names.",
        ),
        requires: canWitness,
        ending: "witness",
      },
      {
        label: L(
          "留在上海，照顾仍在这里的人",
          "Stay in Shanghai. Care for those who remain.",
        ),
        requires: canEmbers,
        ending: "embers",
      },
      {
        label: L(
          "带着信和真相，登上末班船",
          "Board the last ferry with the letter and the truth.",
        ),
        requires: (s) => has(s, "ticket") && has(s, "record"),
        ending: "departure",
      },
      {
        label: L(
          "把证据投入炉火，重新沉默",
          "Burn the evidence. Return to silence.",
        ),
        ending: "silence",
      },
      {
        label: L(
          "还不是时候，回去再看看",
          "Not yet. There are places to revisit.",
        ),
      },
    ],
  },
};

export const scenes: Scene[] = [
  {
    id: "lane",
    name: L("槐生里", "Huaisheng Lane"),
    subtitle: L("雨落旧巷", "Rain in the old lane"),
    description: L(
      "门后的灯，还为谁亮着。",
      "For whom does the light behind the door still burn?",
    ),
    time: "21:10",
    hotspots: [
      {
        id: "aunt",
        label: L("周姨", "Aunt Zhou"),
        kind: "person",
        x: 252,
        y: 237,
        dialogue: (s) => (flag(s, "aunt") ? "auntAgain" : "aunt"),
      },
      {
        id: "wall",
        label: L("旧墙上的纸船", "Boat on the wall"),
        kind: "object",
        x: 478,
        y: 212,
        dialogue: () => "wall",
      },
      {
        id: "home",
        label: L("沈家旧屋", "The old home"),
        kind: "exit",
        x: 172,
        y: 227,
        target: "home",
      },
      {
        id: "press",
        label: L("长明印刷铺", "Changming Press"),
        kind: "exit",
        x: 567,
        y: 230,
        target: "press",
      },
    ],
  },
  {
    id: "home",
    name: L("沈家旧屋", "The Shen Home"),
    subtitle: L("无人收拾的昨日", "An undisturbed yesterday"),
    description: L(
      "灰尘记得每一件离开的东西。",
      "The dust remembers everything that was taken.",
    ),
    time: "21:40",
    hotspots: [
      {
        id: "desk",
        label: L("旧书桌", "Old desk"),
        kind: "object",
        x: 217,
        y: 221,
        dialogue: (s) => (has(s, "photo") ? "deskAgain" : "desk"),
      },
      {
        id: "mirror",
        label: L("裂开的镜子", "Cracked mirror"),
        kind: "object",
        x: 456,
        y: 213,
        dialogue: () => "mirror",
      },
      {
        id: "lane",
        label: L("回到槐生里", "Return to the lane"),
        kind: "exit",
        x: 370,
        y: 319,
        target: "lane",
      },
    ],
  },
  {
    id: "press",
    name: L("长明印刷铺", "Changming Press"),
    subtitle: L("字里有声", "A voice in the type"),
    description: L(
      "有些字，只有在黑暗里才能看清。",
      "Some words can only be read in the dark.",
    ),
    time: "22:20",
    hotspots: [
      {
        id: "lin",
        label: L("林岚", "Lin Lan"),
        kind: "person",
        x: 404,
        y: 229,
        dialogue: (s) => (has(s, "proof") ? "linAgain" : "lin"),
      },
      {
        id: "typecase",
        label: L("铅字盒", "Type case"),
        kind: "object",
        x: 235,
        y: 213,
        dialogue: () => "typecase",
      },
      {
        id: "lane",
        label: L("回到槐生里", "Return to the lane"),
        kind: "exit",
        x: 518,
        y: 310,
        target: "lane",
      },
    ],
  },
  {
    id: "clinic",
    name: L("仁安诊所", "Ren’an Clinic"),
    subtitle: L("灯下的人", "Those beneath the lamp"),
    description: L(
      "灯还亮着，就不是最后一夜。",
      "While the lamp burns, this is not the last night.",
    ),
    time: "23:15",
    hotspots: [
      {
        id: "doctor",
        label: L("罗医生", "Dr. Luo"),
        kind: "person",
        x: 250,
        y: 223,
        dialogue: (s) => (has(s, "testimony") ? "doctorAgain" : "doctor"),
      },
      {
        id: "gu",
        label: L("顾先生", "Mr. Gu"),
        kind: "person",
        x: 451,
        y: 226,
        dialogue: () => "gu",
      },
      {
        id: "lane",
        label: L("回到槐生里", "Return to the lane"),
        kind: "exit",
        x: 361,
        y: 316,
        target: "lane",
      },
    ],
  },
  {
    id: "archive",
    name: L("旧档案室", "The Old Archive"),
    subtitle: L("纸上的余生", "Lives reduced to paper"),
    description: L(
      "一个名字，不应该只有一行。",
      "A name deserves more than a single line.",
    ),
    time: "01:30",
    hotspots: [
      {
        id: "cabinet",
        label: L("转运名册", "Transfer register"),
        kind: "object",
        x: 435,
        y: 226,
        dialogue: (s) => (has(s, "record") ? "cabinetAgain" : "cabinet"),
      },
      {
        id: "archiveWall",
        label: L("停摆的钟", "Stopped clock"),
        kind: "object",
        x: 240,
        y: 202,
        dialogue: () => "archiveWall",
      },
      {
        id: "lane",
        label: L("回到槐生里", "Return to the lane"),
        kind: "exit",
        x: 349,
        y: 317,
        target: "lane",
      },
    ],
  },
  {
    id: "river",
    name: L("黄浦江岸", "The Huangpu Shore"),
    subtitle: L("天亮之前", "Before the dawn"),
    description: L(
      "雾的另一边，未必是答案。",
      "Beyond the mist, there may be no answer.",
    ),
    time: "04:17",
    hotspots: [
      {
        id: "finale",
        label: L("末班渡船", "The last ferry"),
        kind: "exit",
        x: 517,
        y: 256,
        dialogue: () => "finale",
      },
      {
        id: "water",
        label: L("望向江面", "Look across the river"),
        kind: "object",
        x: 259,
        y: 233,
        dialogue: () => "water",
      },
      {
        id: "lane",
        label: L("回到槐生里", "Return to the lane"),
        kind: "exit",
        x: 114,
        y: 295,
        target: "lane",
      },
    ],
  },
];

export const endings: Record<
  EndingId,
  { number: string; title: Text; subtitle: Text; text: Text }
> = {
  witness: {
    number: "I",
    title: L("留名", "Names That Remain"),
    subtitle: L(
      "纸会沉默，记忆不会。",
      "Paper may fall silent. Memory will not.",
    ),
    text: L(
      "你没有登船。黎明前，你和林岚把校样、名册与证言分别抄成两份，藏在不同的地方。\n没有人在第二天宣布你无罪。日子依旧艰难，但从此，真相不再只寄居于一个人的记忆。\n多年以后，有人在旧书夹页里读到沈泊的名字。那不是一行编号，也不是一项指控。那是一个曾经放过纸船的人。",
      "You do not board. Before dawn, you and Lin Lan make two copies of the proof, register, and testimony, hiding them separately.\nNo one declares you innocent the next day. Life remains difficult. But the truth no longer lives in only one person’s memory.\nYears later, someone finds Shen Bo’s name between the pages of an old book. Not a number. Not an accusation. A person who once launched paper boats.",
    ),
  },
  departure: {
    number: "II",
    title: L("渡雾", "Across the Mist"),
    subtitle: L(
      "离开，也是一种活下去。",
      "Leaving is another way to go on living.",
    ),
    text: L(
      "你把信收进贴近心口的衣袋。船离岸时，上海没有回头看你。\n去吴淞的水路很短，往后的路却没有人能告诉你。船票不能保证安全，也没有带来弟弟的消息。\n但你带走了他的名字，和那封没有署日期的信。有一天，你会在另一个有灯的地方，把这一夜写完。",
      "You place the letter close to your heart. As the ferry leaves, Shanghai does not look back.\nThe journey to Wusong is short. No one can tell you what follows. The ticket guarantees no safety and brings no news of your brother.\nBut you carry his name and the undated letter. One day, somewhere with a light, you will finish writing this night.",
    ),
  },
  silence: {
    number: "III",
    title: L("无声", "The Quiet Ash"),
    subtitle: L("火熄以后，雨还在下。", "The fire dies. The rain goes on."),
    text: L(
      "纸在炉里卷曲，名字比纸更早消失。\n你告诉自己，活下去就好。第二天，你像往常一样低着头走过街口。没有人拦住你，也没有人叫你的名字。\n很多年后，你仍会梦见那一夜。梦里的江面漂着一只纸船。每当你伸出手，它就变成一小片灰。",
      "The paper curls in the stove. The names disappear before the paper does.\nYou tell yourself survival is enough. The next day you pass the street corner with your head lowered. No one stops you. No one calls your name.\nYears later, you still dream of that night. A paper boat drifts on the river. Whenever you reach for it, it becomes a little ash.",
    ),
  },
  embers: {
    number: "IV",
    title: L("余灯", "A Lamp Kept Lit"),
    subtitle: L(
      "留一盏灯，等一个未归的人。",
      "Keep a lamp for someone yet to return.",
    ),
    text: L(
      "你回到诊所，把名册收进干燥的抽屉。你答应罗医生，替她走夜路；答应顾先生，常来听他讲青芜的事。\n你不再把整座城市都当作审判自己的房间。它也有生病的人、等门的人，和一盏可以添油的灯。\n每到下雨，周姨都会多留一把伞。你没有找到沈泊。但如果他回来，他仍有门可敲。",
      "You return to the clinic and place the register in a dry drawer. You promise to make Dr. Luo’s night visits, and to listen when Mr. Gu speaks of Qingwu.\nThe city is no longer only a room in which you are judged. It also holds the ill, the waiting, and a lamp that can be refilled.\nWhen it rains, Aunt Zhou keeps an extra umbrella. You have not found Shen Bo. But if he returns, there will still be a door to knock on.",
    ),
  },
};

export function chapter(s: State): { index: number; title: Text } {
  if (has(s, "record"))
    return {
      index: 4,
      title: L("第四章 · 天亮之前", "CHAPTER IV · BEFORE THE DAWN"),
    };
  if (has(s, "proof"))
    return {
      index: 3,
      title: L("第三章 · 纸上的人", "CHAPTER III · LIVES ON PAPER"),
    };
  if (has(s, "key"))
    return {
      index: 2,
      title: L("第二章 · 未寄出的信", "CHAPTER II · THE UNSENT LETTER"),
    };
  return { index: 1, title: L("第一章 · 雨归", "CHAPTER I · HOMECOMING") };
}

export function quests(
  s: State,
): { title: Text; detail: Text; done: boolean }[] {
  return [
    {
      title: L("一把旧钥匙", "An old key"),
      detail: L("向槐生里的周姨打听消息", "Speak to Aunt Zhou in the lane"),
      done: has(s, "key"),
    },
    {
      title: L("被改写的名字", "An altered name"),
      detail: L(
        "去印刷铺找林岚，拿到第三份校样",
        "Find Lin Lan and the third proof at the press",
      ),
      done: has(s, "proof"),
    },
    {
      title: L("纸上的去向", "A trail on paper"),
      detail: L(
        "在档案室寻找沈泊的转运名册",
        "Find Shen Bo’s transfer register in the archive",
      ),
      done: has(s, "record"),
    },
    {
      title: L("活着的证人", "A living witness"),
      detail: L(
        "向仁安诊所的罗医生询问那一夜",
        "Ask Dr. Luo at the clinic about that night",
      ),
      done: has(s, "testimony"),
    },
    {
      title: L("记得我们", "Remember us"),
      detail: L(
        "在旧屋找到合影，交给诊所的顾先生看",
        "Show Mr. Gu the photograph from your old home",
      ),
      done: flag(s, "remembered"),
    },
    {
      title: L("渡过长夜", "Through the long night"),
      detail: L(
        "带着你的选择，前往黄浦江岸",
        "Take your choices to the Huangpu shore",
      ),
      done: s.ending !== null,
    },
  ];
}
