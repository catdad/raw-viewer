# Analytics explainer

The purpose of this document is to be transparent about the analytics being collected, as well as explain a bit about how I am going to use them. To start, all analytics are annonymous. Their purpose is to help me make the application better, and I have no intention to track users.

Below is a breakdown of each piece of data collection and what I will be using it for:

## User ID

Each user will be assigned an ID using a random number generator (`uuid`, to be specific). This ID in no way identifies anything personal about the user. Rather, it just creates the idea of a user. The reason for this bit of data is so that I can tell how many active users I have. If the app is unsuccessful, I may ultimately stop developing it. The user ID allows me to tell how many users there are, how many new users I get over time, and how many users continuously use the application over time.

## Image file type

The main purpose of the application is to view RAW images. However, since every RAW format has different requirements, I have to make some tradeoffs in optimizations at times in order to support all formats. File type data will be used to determine popular formats and make sure that those are the formats that are most optimized.

## Image metadata

This data has two purposes. First, part of this data is the actual camera make. Even though I also collect file types, individual cameras may implement the same type slightly differently. This data is again used to prioritize camera and format support.

In this category, I also collect the lens model, focal length, f-stop, shutter speed, and ISO for images. I have absolutely no use for this data, other than I am a photography nerd. As photographers, we love to talk about these things, so I am just plain curious.

I do not have access to any of your actual photographs, and they will never be tracked by me.

## Computer metadata

This is information about your computer. I will record the kind of CPU you have -- including model, clock speed, and number of cores -- and total computer memory as well as percentage of free memory. Developers tend to have pretty high-end computers, but because the application is fast on my machine does not mean it will be fast for all of you. I need to know what kind of processors are common among users so that I can make sure I am benchmarking and optimizing for those processors.

I will also track operating systems. While Electron does abstract some OS things, there are still times that I will need to differentiate between operating systems. Some examples are supporting MacOS dark mode or Windows dark mode, supporting frameless windows, etc. This application also contains some compiled native code in order to be as fast as possible. All of this stuff is dependent on the operating system, which is why I need to know what is popular specifically among my users.

Finally, I track your screen resolution and number of screens. The user interface of this application (and really any application) should be optimized for the way you use it, and not just the screen I have sitting in front of me. In fact, switching between computers, I have already noticed and improved various experiences that had to do with the available screen space. I want to make sure that the experience is always optimized for the screen sizes that are popular among my users. Further, if many have multiple screens, I might think about how to better optimize the experience of this application to take advantage of that.

## Interactions

Over time, as I add and tweak features, I will need to know which features are popular and which features are never used. Since I develop this application in my free time, this will help me concentrate my development efforts and make sure I am working on the things that are most useful to you. This includes which buttons or keyboard shortcuts are used, which modals are used, etc.

## Questions

All of the code is open-source, so (if you are a developer) you are free to look around and see exatly what or how something is collected. If you have any questions though, please feel free to [file an issue](https://github.com/catdad/raw-viewer/issues/new).
